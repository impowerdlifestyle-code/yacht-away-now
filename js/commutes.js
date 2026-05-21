/**
 * Google Commutes widget — adapted from
 * https://github.com/googlemaps-samples/js-commutes
 * Apache 2.0, Copyright 2023 Google LLC.
 *
 * Expects a global CONFIGURATION object and a window.initMap() entry point
 * triggered by the Google Maps JS API loader.
 */

'use strict';

const commutesEl = {
  map: document.querySelector('.map-view'),
  initialStatePanel: document.querySelector('.commutes-initial-state'),
  destinationPanel: document.querySelector('.commutes-destinations'),
  modal: document.querySelector('.commutes-modal-container'),
};

const destinationPanelEl = {
  addButton: commutesEl.destinationPanel.querySelector('.add-button'),
  container: commutesEl.destinationPanel.querySelector('.destinations-container'),
  list: commutesEl.destinationPanel.querySelector('.destination-list'),
  scrollLeftButton: commutesEl.destinationPanel.querySelector('.left-control'),
  scrollRightButton: commutesEl.destinationPanel.querySelector('.right-control'),
  getActiveDestination: () => commutesEl.destinationPanel.querySelector('.destination.active'),
};

const destinationModalEl = {
  title: commutesEl.modal.querySelector('h2'),
  form: commutesEl.modal.querySelector('form'),
  destinationInput: commutesEl.modal.querySelector('input[name="destination-address"]'),
  errorMessage: commutesEl.modal.querySelector('.error-message'),
  addButton: commutesEl.modal.querySelector('.add-destination-button'),
  deleteButton: commutesEl.modal.querySelector('.delete-destination-button'),
  editButton: commutesEl.modal.querySelector('.edit-destination-button'),
  cancelButton: commutesEl.modal.querySelector('.cancel-button'),
  getTravelModeInput: () => commutesEl.modal.querySelector('input[name="travel-mode"]:checked'),
};

const MAX_NUM_DESTINATIONS = 10;
const BIAS_BOUND_DISTANCE = 0.5;
const HOUR_IN_SECONDS = 3600;
const MIN_IN_SECONDS = 60;

const STROKE_COLORS = {
  active: { innerStroke: '#c9a84c', outerStroke: '#b8912e' },
  inactive: { innerStroke: '#4ecdc4', outerStroke: '#2a8b85' },
};

const MARKER_ICON_COLORS = {
  active: { fill: '#c9a84c', stroke: '#b8912e', label: '#0a1628' },
  inactive: { fill: '#0f1f38', stroke: '#4ecdc4', label: '#f5f0e8' },
};

const DestinationOperation = { ADD: 'ADD', EDIT: 'EDIT', DELETE: 'DELETE' };

const TravelMode = {
  DRIVING: 'DRIVING',
  TRANSIT: 'TRANSIT',
  BICYCLING: 'BICYCLING',
  WALKING: 'WALKING',
};

function Commutes(configuration) {
  let commutesMap;
  let activeDestinationIndex;
  const origin = configuration.mapOptions.center;
  const destinations = configuration.destination || [];
  let markerIndex = 0;
  let lastActiveEl;

  const markerIconConfig = {
    path:
        'M10 27c-.2 0-.2 0-.5-1-.3-.8-.7-2-1.6-3.5-1-1.5-2-2.7-3-3.8-2.2-2.8-3.9-5-3.9-8.8C1 4.9 5 1 10 1s9 4 9 8.9c0 3.9-1.8 6-4 8.8-1 1.2-1.9 2.4-2.8 3.8-1 1.5-1.4 2.7-1.6 3.5-.3 1-.4 1-.6 1Z',
    fillOpacity: 1,
    strokeWeight: 1,
    anchor: new google.maps.Point(15, 29),
    scale: 1.2,
    labelOrigin: new google.maps.Point(10, 9),
  };
  const originMarkerIcon = {
    ...markerIconConfig,
    fillColor: MARKER_ICON_COLORS.active.fill,
    strokeColor: MARKER_ICON_COLORS.active.stroke,
  };
  const destinationMarkerIcon = {
    ...markerIconConfig,
    fillColor: MARKER_ICON_COLORS.inactive.fill,
    strokeColor: MARKER_ICON_COLORS.inactive.stroke,
  };
  const bikeLayer = new google.maps.BicyclingLayer();
  const publicTransitLayer = new google.maps.TransitLayer();

  initMapView();
  initDestinations();
  initCommutesPanel();
  initCommutesModal();

  function initMapView() {
    commutesMap = new google.maps.Map(commutesEl.map, configuration.mapOptions);
    configuration.defaultTravelModeEnum = parseTravelModeEnum(configuration.defaultTravelMode);
    setTravelModeLayer(configuration.defaultTravelModeEnum);
    createMarker(origin);
  }

  function initDestinations() {
    if (!configuration.initialDestinations) return;
    let callbackCounter = 0;
    const placesService = new google.maps.places.PlacesService(commutesMap);
    for (const destination of configuration.initialDestinations) {
      destination.travelModeEnum = parseTravelModeEnum(destination.travelMode);
      const label = getNextMarkerLabel();
      const request = { placeId: destination.placeId, fields: ['place_id', 'geometry', 'name'] };
      placesService.getDetails(request, function (place) {
        if (!place || !place.geometry || !place.geometry.location) return;
        const travelModeEnum = destination.travelModeEnum || configuration.defaultTravelModeEnum;
        const destinationConfig = createDestinationConfig(place, travelModeEnum, label);
        getDirections(destinationConfig).then((response) => {
          if (!response) return;
          destinations.push(destinationConfig);
          getCommutesInfo(response, destinationConfig);
          callbackCounter++;
          if (callbackCounter === configuration.initialDestinations.length) {
            destinations.sort((a, b) => (a.label < b.label ? -1 : 1));
            const bounds = new google.maps.LatLngBounds();
            for (let i = 0; i < destinations.length; i++) {
              assignMapObjectListeners(destinations[i], i);
              updateCommutesPanel(destinations[i], i, DestinationOperation.ADD);
              bounds.union(destinations[i].bounds);
            }
            const lastIndex = destinations.length - 1;
            handleRouteClick(destinations[lastIndex], lastIndex);
            commutesMap.fitBounds(bounds);
          }
        });
      });
    }
  }

  function initCommutesPanel() {
    const addCommutesButtonEls = document.querySelectorAll('.add-button');
    addCommutesButtonEls.forEach((addButton) => {
      addButton.addEventListener('click', () => {
        destinationModalEl.title.innerHTML = 'Add destination';
        hideElement(destinationModalEl.deleteButton);
        hideElement(destinationModalEl.editButton);
        showElement(destinationModalEl.addButton);
        showModal();
        const travelModeEnum = configuration.defaultTravelModeEnum || TravelMode.DRIVING;
        const travelModeId = travelModeEnum.toLowerCase() + '-mode';
        document.forms['destination-form'][travelModeId].checked = true;
      });
    });

    destinationPanelEl.scrollLeftButton.addEventListener('click', handleScrollButtonClick);
    destinationPanelEl.scrollRightButton.addEventListener('click', handleScrollButtonClick);
    destinationPanelEl.list.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target !== destinationPanelEl.getActiveDestination()) {
        e.target.click();
        e.preventDefault();
      }
    });
  }

  function initCommutesModal() {
    const boundConfig = {
      north: origin.lat + BIAS_BOUND_DISTANCE,
      south: origin.lat - BIAS_BOUND_DISTANCE,
      east: origin.lng + BIAS_BOUND_DISTANCE,
      west: origin.lng - BIAS_BOUND_DISTANCE,
    };

    const destinationFormReset = function () {
      destinationModalEl.destinationInput.classList.remove('error');
      destinationModalEl.errorMessage.innerHTML = '';
      destinationModalEl.form.reset();
      destinationToAdd = null;
    };

    const autocompleteOptions = {
      bounds: boundConfig,
      fields: ['place_id', 'geometry', 'name'],
    };
    const autocomplete = new google.maps.places.Autocomplete(destinationModalEl.destinationInput, autocompleteOptions);
    let destinationToAdd;
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) return;
      destinationToAdd = place;
      destinationModalEl.getTravelModeInput().focus();
      destinationModalEl.destinationInput.classList.remove('error');
      destinationModalEl.errorMessage.innerHTML = '';
    });

    destinationModalEl.addButton.addEventListener('click', () => {
      const isValidInput = validateDestinationInput(destinationToAdd);
      if (!isValidInput) return;
      const selectedTravelMode = destinationModalEl.getTravelModeInput().value;
      addDestinationToList(destinationToAdd, selectedTravelMode);
      destinationFormReset();
      hideModal();
    });

    destinationModalEl.editButton.addEventListener('click', () => {
      const destination = { ...destinations[activeDestinationIndex] };
      const selectedTravelMode = destinationModalEl.getTravelModeInput().value;
      const isSameDestination = destination.name === destinationModalEl.destinationInput.value;
      const isSameTravelMode = destination.travelModeEnum === selectedTravelMode;
      if (isSameDestination && isSameTravelMode) { hideModal(); return; }
      if (!isSameDestination) {
        const isValidInput = validateDestinationInput(destinationToAdd);
        if (!isValidInput) return;
        destination.name = destinationToAdd.name;
        destination.place_id = destinationToAdd.place_id;
        destination.url = generateMapsUrl(destinationToAdd, selectedTravelMode);
      }
      if (!isSameTravelMode) {
        destination.travelModeEnum = selectedTravelMode;
        destination.url = generateMapsUrl(destination, selectedTravelMode);
      }
      destinationFormReset();
      getDirections(destination)
        .then((response) => {
          if (!response) return;
          removeDirectionsFromMapView(destinations[activeDestinationIndex]);
          destinations[activeDestinationIndex] = destination;
          getCommutesInfo(response, destination);
          assignMapObjectListeners(destination, activeDestinationIndex);
          updateCommutesPanel(destination, activeDestinationIndex, DestinationOperation.EDIT);
          handleRouteClick(destination, activeDestinationIndex);
          const newEditButton = destinationPanelEl.list.children
            .item(activeDestinationIndex)
            .querySelector('.edit-button');
          newEditButton.focus();
        })
        .catch((e) => console.error('Editing directions failed due to ' + e));
      hideModal();
    });

    destinationModalEl.cancelButton.addEventListener('click', () => { destinationFormReset(); hideModal(); });

    destinationModalEl.deleteButton.addEventListener('click', () => {
      removeDirectionsFromMapView(destinations[activeDestinationIndex]);
      updateCommutesPanel(destinations[activeDestinationIndex], activeDestinationIndex, DestinationOperation.DELETE);
      activeDestinationIndex = undefined;
      destinationFormReset();
      let elToFocus;
      if (destinations.length) {
        const lastIndex = destinations.length - 1;
        handleRouteClick(destinations[lastIndex], lastIndex);
        elToFocus = destinationPanelEl.getActiveDestination();
      } else {
        elToFocus = commutesEl.initialStatePanel.querySelector('.add-button');
      }
      hideModal(elToFocus);
    });

    window.onmousedown = function (event) {
      if (event.target === commutesEl.modal) { destinationFormReset(); hideModal(); }
    };

    commutesEl.modal.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Enter':
          if (e.target === destinationModalEl.cancelButton || e.target === destinationModalEl.deleteButton) return;
          if (destinationModalEl.addButton.style.display !== 'none') destinationModalEl.addButton.click();
          else if (destinationModalEl.editButton.style.display !== 'none') destinationModalEl.editButton.click();
          break;
        case 'Esc':
        case 'Escape':
          hideModal();
          break;
        default:
          return;
      }
      e.preventDefault();
    });

    const firstInteractiveElement = destinationModalEl.destinationInput;
    const lastInteractiveElements = [destinationModalEl.addButton, destinationModalEl.editButton];

    firstInteractiveElement.addEventListener('keydown', handleFirstInteractiveElementTab);
    for (const el of lastInteractiveElements) el.addEventListener('keydown', handleLastInteractiveElementTab);

    function handleFirstInteractiveElementTab(event) {
      if (event.key === 'Tab' && event.shiftKey) {
        for (const el of lastInteractiveElements) {
          if (el.style.display !== 'none') { event.preventDefault(); el.focus(); return; }
        }
      }
    }

    function handleLastInteractiveElementTab(event) {
      if (event.key === 'Tab' && !event.shiftKey) { event.preventDefault(); firstInteractiveElement.focus(); }
    }
  }

  function validateDestinationInput(destinationToAdd) {
    let errorMessage;
    let isValidInput = false;
    if (!destinationToAdd) {
      errorMessage = 'No details available for destination input';
    } else if (destinations.length > MAX_NUM_DESTINATIONS) {
      errorMessage = 'Cannot add more than ' + MAX_NUM_DESTINATIONS + ' destinations';
    } else if (destinations && destinations.find((d) => d.place_id === destinationToAdd.place_id)) {
      errorMessage = 'Destination is already added';
    } else {
      isValidInput = true;
    }
    if (!isValidInput) {
      destinationModalEl.errorMessage.innerHTML = errorMessage;
      destinationModalEl.destinationInput.classList.add('error');
    }
    return isValidInput;
  }

  function removeDirectionsFromMapView(destination) {
    destination.polylines.innerStroke.setMap(null);
    destination.polylines.outerStroke.setMap(null);
    destination.marker.setMap(null);
  }

  function buildDestinationCardTemplate(destination, destinationIdx, destinationOperation) {
    let editButtonEl;
    switch (destinationOperation) {
      case DestinationOperation.ADD:
        destinationPanelEl.list.insertAdjacentHTML('beforeend',
          '<div class="destination-container">' + generateDestinationTemplate(destination) + '</div>');
        const destinationContainerEl = destinationPanelEl.list.lastElementChild;
        destinationContainerEl.addEventListener('click', () => handleRouteClick(destination, destinationIdx));
        editButtonEl = destinationContainerEl.querySelector('.edit-button');
        destinationPanelEl.container.scrollLeft = destinationPanelEl.container.scrollWidth;
        break;
      case DestinationOperation.EDIT:
        const activeDestinationContainerEl = destinationPanelEl.getActiveDestination().parentElement;
        activeDestinationContainerEl.innerHTML = generateDestinationTemplate(destination);
        activeDestinationContainerEl.addEventListener('click', () => handleRouteClick(destination, destinationIdx));
        editButtonEl = activeDestinationContainerEl.querySelector('.edit-button');
        break;
      case DestinationOperation.DELETE:
      default:
    }
    editButtonEl.addEventListener('click', () => {
      destinationModalEl.title.innerHTML = 'Edit destination';
      destinationModalEl.destinationInput.value = destination.name;
      showElement(destinationModalEl.deleteButton);
      showElement(destinationModalEl.editButton);
      hideElement(destinationModalEl.addButton);
      showModal();
      const travelModeId = destination.travelModeEnum.toLowerCase() + '-mode';
      document.forms['destination-form'][travelModeId].checked = true;
      destinationModalEl.destinationInput.dispatchEvent(new Event('input'));
    });
  }

  function updateCommutesPanel(destination, destinationIdx, destinationOperation) {
    switch (destinationOperation) {
      case DestinationOperation.ADD:
        hideElement(commutesEl.initialStatePanel);
        showElement(commutesEl.destinationPanel);
      case DestinationOperation.EDIT:
        buildDestinationCardTemplate(destination, destinationIdx, destinationOperation);
        break;
      case DestinationOperation.DELETE:
        destinations.splice(destinationIdx, 1);
        destinationPanelEl.list.innerHTML = '';
        for (let i = 0; i < destinations.length; i++) {
          buildDestinationCardTemplate(destinations[i], i, DestinationOperation.ADD);
          assignMapObjectListeners(destinations[i], i);
        }
      default:
    }
    if (!destinations.length) {
      showElement(commutesEl.initialStatePanel, commutesEl.initialStatePanel);
      hideElement(commutesEl.destinationPanel);
      activeDestinationIndex = undefined;
      return;
    }
    destinationPanelEl.container.addEventListener('scroll', handlePanelScroll);
    destinationPanelEl.container.dispatchEvent(new Event('scroll'));
  }

  function addDestinationToList(destinationToAdd, travelModeEnum) {
    const destinationConfig = createDestinationConfig(destinationToAdd, travelModeEnum);
    const newDestinationIndex = destinations.length;
    getDirections(destinationConfig)
      .then((response) => {
        if (!response) return;
        destinations.push(destinationConfig);
        getCommutesInfo(response, destinationConfig);
        assignMapObjectListeners(destinationConfig, newDestinationIndex);
        updateCommutesPanel(destinationConfig, newDestinationIndex, DestinationOperation.ADD);
        handleRouteClick(destinationConfig, newDestinationIndex);
        destinationPanelEl.addButton.focus();
      })
      .catch((e) => console.error('Adding destination failed due to ' + e));
  }

  function getNextMarkerLabel() {
    const markerLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const label = markerLabels[markerIndex];
    markerIndex = (markerIndex + 1) % markerLabels.length;
    return label;
  }

  function createDestinationConfig(destinationToAdd, travelModeEnum, label) {
    return {
      name: destinationToAdd.name,
      place_id: destinationToAdd.place_id,
      label: label || getNextMarkerLabel(),
      travelModeEnum: travelModeEnum,
      url: generateMapsUrl(destinationToAdd, travelModeEnum),
    };
  }

  function getDirections(destination) {
    const request = {
      origin: origin,
      destination: { placeId: destination.place_id },
      travelMode: destination.travelModeEnum,
      unitSystem:
        configuration.distanceMeasurementType === 'METRIC'
          ? google.maps.UnitSystem.METRIC
          : google.maps.UnitSystem.IMPERIAL,
    };
    const directionsService = new google.maps.DirectionsService();
    return directionsService.route(request).then((response) => response);
  }

  function getCommutesInfo(directionResponse, destination) {
    if (!directionResponse) return;
    const path = directionResponse.routes[0].overview_path;
    const bounds = directionResponse.routes[0].bounds;
    const directionLeg = directionResponse.routes[0].legs[0];
    const destinationLocation = directionLeg.end_location;
    const distance = directionLeg.distance.text;
    const duration = convertDurationValueAsString(directionLeg.duration.value);

    const innerStroke = new google.maps.Polyline({
      path: path, strokeColor: STROKE_COLORS.inactive.innerStroke,
      strokeOpacity: 1.0, strokeWeight: 3, zIndex: 10,
    });
    const outerStroke = new google.maps.Polyline({
      path: path, strokeColor: STROKE_COLORS.inactive.outerStroke,
      strokeOpacity: 1.0, strokeWeight: 6, zIndex: 1,
    });

    const marker = createMarker(destinationLocation, destination.label);
    innerStroke.setMap(commutesMap);
    outerStroke.setMap(commutesMap);

    destination.distance = distance;
    destination.duration = duration;
    destination.marker = marker;
    destination.polylines = { innerStroke, outerStroke };
    destination.bounds = bounds;
  }

  function assignMapObjectListeners(destination, destinationIdx) {
    google.maps.event.clearListeners(destination.marker, 'click');
    google.maps.event.addListener(destination.marker, 'click', () => {
      handleRouteClick(destination, destinationIdx);
      destinationPanelEl.list.querySelectorAll('.destination')[destinationIdx].focus();
    });
    google.maps.event.addListener(destination.marker, 'mouseover', () => changeMapObjectStrokeWeight(destination, true));
    google.maps.event.addListener(destination.marker, 'mouseout', () => changeMapObjectStrokeWeight(destination, false));
    for (const strokeLine in destination.polylines) {
      google.maps.event.clearListeners(destination.polylines[strokeLine], 'click');
      google.maps.event.clearListeners(destination.polylines[strokeLine], 'mouseover');
      google.maps.event.addListener(destination.polylines[strokeLine], 'click', () => {
        handleRouteClick(destination, destinationIdx);
        destinationPanelEl.list.querySelectorAll('.destination')[destinationIdx].focus();
      });
      google.maps.event.addListener(destination.polylines[strokeLine], 'mouseover', () => changeMapObjectStrokeWeight(destination, true));
      google.maps.event.addListener(destination.polylines[strokeLine], 'mouseout', () => changeMapObjectStrokeWeight(destination, false));
    }
  }

  function generateMapsUrl(destination, travelModeEnum) {
    let googleMapsUrl = 'https://www.google.com/maps/dir/?api=1';
    googleMapsUrl += `&origin=${origin.lat},${origin.lng}`;
    googleMapsUrl += '&destination=' + encodeURIComponent(destination.name) +
                     '&destination_place_id=' + destination.place_id;
    googleMapsUrl += '&travelmode=' + travelModeEnum.toLowerCase();
    return googleMapsUrl;
  }

  function changeMapObjectStrokeWeight(destination, mouseOver) {
    const destinationMarkerIcon = destination.marker.icon;
    if (mouseOver) {
      destination.polylines.outerStroke.setOptions({ strokeWeight: 8 });
      destinationMarkerIcon.strokeWeight = 2;
    } else {
      destination.polylines.outerStroke.setOptions({ strokeWeight: 6 });
      destinationMarkerIcon.strokeWeight = 1;
    }
    destination.marker.setIcon(destinationMarkerIcon);
  }

  function handleRouteClick(destination, destinationIdx) {
    if (activeDestinationIndex !== undefined) {
      destinations[activeDestinationIndex].polylines.innerStroke.setOptions(
        { strokeColor: STROKE_COLORS.inactive.innerStroke, zIndex: 2 });
      destinations[activeDestinationIndex].polylines.outerStroke.setOptions(
        { strokeColor: STROKE_COLORS.inactive.outerStroke, zIndex: 1 });
      destinations[activeDestinationIndex].marker.setIcon(destinationMarkerIcon);
      destinations[activeDestinationIndex].marker.label.color = MARKER_ICON_COLORS.inactive.label;
      const activeDestinationEl = destinationPanelEl.getActiveDestination();
      if (activeDestinationEl) activeDestinationEl.classList.remove('active');
    }

    activeDestinationIndex = destinationIdx;
    setTravelModeLayer(destination.travelModeEnum);
    const newDestinationEl = destinationPanelEl.list.querySelectorAll('.destination')[destinationIdx];
    newDestinationEl.classList.add('active');
    newDestinationEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    destination.polylines.innerStroke.setOptions({ strokeColor: STROKE_COLORS.active.innerStroke, zIndex: 101 });
    destination.polylines.outerStroke.setOptions({ strokeColor: STROKE_COLORS.active.outerStroke, zIndex: 99 });
    destination.marker.setIcon(originMarkerIcon);
    destination.marker.label.color = MARKER_ICON_COLORS.active.label;
    commutesMap.fitBounds(destination.bounds);
  }

  function createMarker(location, label) {
    const isOrigin = label === undefined;
    const markerIconConfig = isOrigin ? originMarkerIcon : destinationMarkerIcon;
    const labelColor = isOrigin ? MARKER_ICON_COLORS.active.label : MARKER_ICON_COLORS.inactive.label;
    const labelText = isOrigin ? '⚓' : label;

    const mapOptions = {
      position: location,
      map: commutesMap,
      label: { text: labelText, fontFamily: 'Arial, sans-serif', color: labelColor, fontSize: '16px' },
      icon: markerIconConfig,
      title: isOrigin ? 'Yacht Away Now — St. Petersburg, FL' : undefined,
    };
    if (isOrigin) { mapOptions.label.className += ' origin-pin-label'; mapOptions.label.fontSize = '14px'; }
    return new google.maps.Marker(mapOptions);
  }

  function parseTravelModeEnum(travelModeString) {
    switch (travelModeString) {
      case 'DRIVING': return TravelMode.DRIVING;
      case 'BICYCLING': return TravelMode.BICYCLING;
      case 'PUBLIC_TRANSIT': return TravelMode.TRANSIT;
      case 'WALKING': return TravelMode.WALKING;
      default: return null;
    }
  }

  function setTravelModeLayer(travelModeEnum) {
    switch (travelModeEnum) {
      case TravelMode.BICYCLING: publicTransitLayer.setMap(null); bikeLayer.setMap(commutesMap); break;
      case TravelMode.TRANSIT: bikeLayer.setMap(null); publicTransitLayer.setMap(commutesMap); break;
      default: publicTransitLayer.setMap(null); bikeLayer.setMap(null);
    }
  }

  function convertDurationValueAsString(durationValue) {
    if (!durationValue) return '';
    if (durationValue < MIN_IN_SECONDS) return '<1 min';
    if (durationValue > HOUR_IN_SECONDS * 10) return '10+ hours';
    const hours = Math.floor(durationValue / HOUR_IN_SECONDS);
    const minutes = Math.floor((durationValue % HOUR_IN_SECONDS) / 60);
    const hoursString = hours > 0 ? hours + ' h' : '';
    const minutesString = minutes > 0 ? minutes + ' min' : '';
    const spacer = hoursString && minutesString ? ' ' : '';
    return hoursString + spacer + minutesString;
  }

  function showModal() {
    lastActiveEl = document.activeElement;
    showElement(commutesEl.modal, destinationModalEl.destinationInput);
  }

  function hideModal(focusEl) {
    hideElement(commutesEl.modal, focusEl || lastActiveEl);
  }
}

function hideElement(el, focusEl) { el.style.display = 'none'; if (focusEl) focusEl.focus(); }
function showElement(el, focusEl) { el.style.display = 'flex'; if (focusEl) focusEl.focus(); }

function handleScrollButtonClick(e) {
  const multiplier = 1.25;
  const direction = e.target.dataset.direction;
  const cardWidth = destinationPanelEl.list.firstElementChild.offsetWidth;
  destinationPanelEl.container.scrollBy({ left: direction * cardWidth * multiplier, behavior: 'smooth' });
}

function handlePanelScroll() {
  const position = destinationPanelEl.container.scrollLeft;
  const scrollWidth = destinationPanelEl.container.scrollWidth;
  const width = destinationPanelEl.container.offsetWidth;
  if (scrollWidth > width) {
    if (position === 0) destinationPanelEl.scrollLeftButton.classList.remove('visible');
    else destinationPanelEl.scrollLeftButton.classList.add('visible');
    if (Math.ceil(position + width) >= scrollWidth) destinationPanelEl.scrollRightButton.classList.remove('visible');
    else destinationPanelEl.scrollRightButton.classList.add('visible');
  }
}

function generateDestinationTemplate(destination) {
  const travelModeIconTemplate = '<use href="#commutes-' + destination.travelModeEnum.toLowerCase() + '-icon"/>';
  return `
    <div class="destination" tabindex="0" role="button">
      <div class="destination-content">
        <div class="metadata">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${travelModeIconTemplate}</svg>
          ${destination.distance}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><use href="#commutes-arrow-icon"/></svg>
          <span class="location-marker">${destination.label}</span>
        </div>
        <div class="address">From <abbr title="${destination.name}">${destination.name}</abbr></div>
        <div class="destination-eta">${destination.duration}</div>
      </div>
    </div>
    <div class="destination-controls">
      <a class="directions-button" href=${destination.url} target="_blank" rel="noopener" aria-label="Open directions in Google Maps">
        <svg aria-label="Directions icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><use href="#commutes-directions-icon"/></svg>
      </a>
      <button class="edit-button" aria-label="Edit Destination">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><use href="#commutes-edit-icon"/></svg>
        Edit
      </button>
    </div>`;
}

window.initMap = function () { new Commutes(window.CONFIGURATION); };
