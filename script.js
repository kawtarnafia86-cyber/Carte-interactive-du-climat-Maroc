// --- 1. CONFIGURATION DES FONDS DE CARTE (BASEMAPS) ---

// Fond Standard (OpenStreetMap)
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
});

// Fond Satellite (Esri World Imagery)
const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

// Fond Clair (CartoDB Positron) - Idéal pour la lisibilité des données
const lightLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
});

// Initialisation de la carte avec le fond clair par défaut
const map = L.map('map', {
    center: [28.5, -9.5], // Centre approximatif du Maroc
    zoom: 5,
    layers: [lightLayer] // La couche par défaut au démarrage
});

// Variables globales pour la couche de données
let geojsonLayer;
let myChart = null;

// --- 2. GESTION DES COUCHES (LAYER CONTROL) ---

// On prépare l'objet pour le menu de contrôle
const baseMaps = {
    "Plan Standard (Clair)": lightLayer,
    "Plan OpenStreetMap": osmLayer,
    "Vue Satellite": satelliteLayer
};

// La couche de données sera ajoutée ici plus tard
const overlayMaps = {
    // "Données Climatiques": geojsonLayer (sera ajouté dynamiquement)
};

// Ajout du contrôleur de couches en haut à droite
const layerControl = L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);


// --- 3. FONCTIONS DE STYLE (COULEURS) ---

function getColor(d, variable) {
    if (d === null || d === undefined || isNaN(d)) return 'transparent'; // Transparent si pas de données

    if (variable === 'temp') {
        return d > 30 ? '#800026' : d > 25 ? '#BD0026' : d > 20 ? '#E31A1C' :
               d > 15 ? '#FC4E2A' : d > 10 ? '#FD8D3C' : '#FFEDA0';
    } else if (variable === 'precip') {
        return d > 100 ? '#08519c' : d > 80  ? '#3182bd' : d > 60  ? '#6baed6' :
               d > 40  ? '#9ecae1' : d > 20  ? '#c6dbef' : '#eff3ff';
    } else { 
        return d > 4.0 ? '#006837' : d > 3.0 ? '#31a354' : d > 2.0 ? '#78c679' :
               d > 1.0 ? '#addd8e' : d > 0.5 ? '#d9f0a3' : '#ffffe5';
    }
}

function style(feature) {
    const selectedVar = document.getElementById('variable-select').value;
    const selectedYear = document.getElementById('year-select').value;
    
    let value = 0;
    if (feature.properties.data && 
        feature.properties.data[selectedYear] && 
        feature.properties.data[selectedYear][selectedVar] !== undefined) {
        value = feature.properties.data[selectedYear][selectedVar];
    }

    return {
        fillColor: getColor(value, selectedVar),
        weight: 1,
        opacity: 1,
        color: 'white', // Bordure blanche entre les régions
        dashArray: '3',
        fillOpacity: 0.7 // Transparence pour voir un peu le fond
    };
}

// --- 4. INTERACTION UTILISATEUR ---

function highlightFeature(e) {
    var layer = e.target;
    layer.setStyle({
        weight: 3,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.9
    });
    layer.bringToFront();
}

function resetHighlight(e) {
    geojsonLayer.resetStyle(e.target);
}

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
    
    const props = e.target.feature.properties;
    // Tente de trouver le nom de la région dans les propriétés standard
    const regionName = props.NAME_1 || props.Nom_Region || props.NOM_REGION || props.name || "Région inconnue";
    
    document.getElementById('region-name').innerText = regionName;

    const selectedVar = document.getElementById('variable-select').value;
    const selectedYear = document.getElementById('year-select').value;
    
    let val = "N/D";
    if(props.data && props.data[selectedYear]) {
        val = props.data[selectedYear][selectedVar];
        if(val !== undefined && val !== null) val = val.toFixed(2);
    }
    
    let unit = selectedVar === 'temp' ? ' °C' : selectedVar === 'precip' ? ' mm' : '';
    document.getElementById('region-value').innerText = val + unit;

    updateChart(props, regionName);
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
    
    // Ajout d'une info-bulle simple au survol
    const name = feature.properties.NAME_1 || feature.properties.NOM_REGION || "Région";
    layer.bindTooltip(name, { sticky: true });
}

// --- 5. GRAPHIQUE (CHART.JS) ---

function updateChart(props, regionName) {
    const ctx = document.getElementById('myChart').getContext('2d');
    const years = ['2023', '2024', '2025'];

    const getDataArray = (variable) => {
        return years.map(y => {
            if (props.data && props.data[y]) return props.data[y][variable];
            return null;
        });
    };

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Température (°C)',
                    data: getDataArray('temp'),
                    borderColor: '#FF6384',
                    backgroundColor: '#FF6384',
                    type: 'line',
                    yAxisID: 'y'
                },
                {
                    label: 'Précipitations (mm)',
                    data: getDataArray('precip'),
                    backgroundColor: '#36A2EB',
                    yAxisID: 'y1'
                },
                {
                    label: 'Végétation (Mai)',
                    data: getDataArray('ndvi_high'),
                    backgroundColor: '#4BC0C0',
                    yAxisID: 'y2'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: `Données : ${regionName}` }
            },
            scales: {
                y: { type: 'linear', display: true, position: 'left', title: {display: true, text: 'Temp (°C)'} },
                y1: { type: 'linear', display: true, position: 'right', grid: {drawOnChartArea: false}, title: {display: true, text: 'Pluie (mm)'} },
                y2: { display: false, min: 0, max: 6 }
            }
        }
    });
}

// --- 6. CHARGEMENT ET INITIALISATION ---

function initMap() {
    fetch('data_maroc.json')
        .then(response => {
            if (!response.ok) throw new Error("Fichier introuvable");
            return response.json();
        })
        .then(data => {
            console.log("Données chargées");

            // Création de la couche GeoJSON
            geojsonLayer = L.geoJson(data, {
                style: style,
                onEachFeature: onEachFeature
            });

            // Ajout de la couche à la carte par défaut
            geojsonLayer.addTo(map);

            // Ajout dynamique au contrôleur de couches
            // Cela permet de cocher/décocher "Données Régionales"
            layerControl.addOverlay(geojsonLayer, "Données Régionales");

            // Zoom sur le Maroc
            map.fitBounds(geojsonLayer.getBounds());
        })
        .catch(error => {
            console.error(error);
            alert("Erreur chargement JSON. Vérifiez la console (F12).");
        });
}

// Mises à jour lors des changements de sélection
document.getElementById('variable-select').addEventListener('change', () => { if(geojsonLayer) geojsonLayer.setStyle(style); });
document.getElementById('year-select').addEventListener('change', () => { if(geojsonLayer) geojsonLayer.setStyle(style); });

initMap();
