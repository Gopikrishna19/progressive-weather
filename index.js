(function () {

  'use strict';

  var app = {
    isLoading: true,
    hasRequestPending: false,
    visibleCards: {},
    selectedCities: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.card.template'),
    container: document.querySelector('main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };

  document.getElementById('btnRefresh').addEventListener('click', function () {
    app.updateForecasts();
  });

  document.getElementById('btnAdd').addEventListener('click', function () {
    app.toggleAddDialog(true);
  });

  document.getElementById('btnAddCity').addEventListener('click', function () {
    var select = document.getElementById('selectCityToAdd');
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    app.getForecast(key, label);
    app.selectedCities.push({
      key: key,
      label: label
    });
    app.saveSelectedCities();
    app.toggleAddDialog(false);
  });

  document.getElementById('btnAddCancel').addEventListener('click', function () {
    app.toggleAddDialog(false);
  });

  app.toggleAddDialog = function (visible) {
    if (visible) {
      app.addDialog.classList.add('visible');
    } else {
      app.addDialog.classList.remove('visible');
    }
  };

  app.updateForecastCard = function (data) {
    var card = app.visibleCards[data.key];

    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.label;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;
    }
    card.querySelector('.description').textContent = data.currently.summary;
    card.querySelector('.date').textContent = new Date(data.currently.time * 1000);
    card.querySelector('.current .icon').classList.add(data.currently.icon);
    card.querySelector('.current .temperature .value').textContent = Math.round(data.currently.temperature);
    card.querySelector('.current .feels-like .value').textContent = Math.round(data.currently.apparentTemperature);
    card.querySelector('.current .precip').textContent = Math.round(data.currently.precipProbability * 100) + '%';
    card.querySelector('.current .humidity').textContent = Math.round(data.currently.humidity * 100) + '%';
    card.querySelector('.current .wind .value').textContent = Math.round(data.currently.windSpeed);
    card.querySelector('.current .wind .direction').textContent = data.currently.windBearing;

    var nextDays = card.querySelectorAll('.future .oneday');
    var today = new Date().getDay();

    for (var i = 0; i < 7; i++) {
      var nextDay = nextDays[i];
      var daily = data.daily.data[i];

      if (daily && nextDay) {
        nextDay.querySelector('.date').textContent = app.daysOfWeek[(i + today) % 7];
        nextDay.querySelector('.icon').classList.add(daily.icon);
        nextDay.querySelector('.temp-high .value').textContent = Math.round(daily.temperatureMax);
        nextDay.querySelector('.temp-low .value').textContent = Math.round(daily.temperatureMin);
      }
    }

    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };

  app.getForecast = function (key, label) {
    var url = 'https://publicdata-weather.firebaseio.com/' + key + '.json';
    if ('caches' in window) {
      caches.match(url).then(function(response) {
        if (response) {
          response.json().then(function(json) {
            // Only update if the XHR is still pending, otherwise the XHR
            // has already returned and provided the latest data.
            if (app.hasRequestPending) {
              console.log('[App] Forecast Updated From Cache');
              json.key = key;
              json.label = label;
              app.updateForecastCard(json);
            }
          });
        }
      });
    }
    app.hasRequestPending = true;
    // Make the XHR to get the data, then update the card
    var request = new XMLHttpRequest();

    request.onreadystatechange = function () {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          response.key = key;
          response.label = label;
          app.hasRequestPending = false;
          console.log('[App] Forecast Updated From Network');
          app.updateForecastCard(response);
        }
      }
    };

    request.open('GET', url);
    request.send();
  };

  app.updateForecasts = function () {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function (key) {
      app.getForecast(key);
    });
  };

  app.saveSelectedCities = function () {
    localStorage.selectedCities = JSON.stringify(app.selectedCities);
  };

  app.init = function () {

    var selectedCities = localStorage.selectedCities;

    if (selectedCities) {
      app.selectedCities = JSON.parse(selectedCities);
      app.selectedCities.forEach(function (city) {
        app.getForecast(city.key, city.label);
      });
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('./worker.js')
        .then(function () {
          console.log('Service Worker Registered');
        });
    }

  };

  app.init();

})();
