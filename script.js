// --- 1. CONFIGURATION INITIALE ---

// Initialisation de la carte centrée sur le Maroc
const map = L.map('map').setView([28.5, -9.5], 5);

// Fond de carte (OpenStreetMap version claire)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// Variables globales
let geojsonLayer;
let myChart = null;

// --- 2. FONCTIONS DE STYLE (COULEURS) ---

// Détermine la couleur en fonction de la valeur et de la variable choisie
function getColor(d, variable) {
    // Gestion des valeurs nulles ou undefined
    if (d === null || d === undefined) return '#ccc'; // Gris si pas de données

    if (variable === 'temp') {
        // Palette Rouge/Orange pour la température
        return d > 30 ? '#800026' : 
               d > 25 ? '#BD0026' : 
               d > 20 ? '#E31A1C' :
               d > 15 ? '#FC4E2A' : 
               d > 10 ? '#FD8D3C' : '#FFEDA0';
    } else if (variable === 'precip') {
        // Palette Bleue pour les précipitations
        return d > 100 ? '#08519c' : 
               d > 80  ? '#3182bd' : 
               d > 60  ? '#6baed6' :
               d > 40  ? '#9ecae1' : 
               d > 20  ? '#c6dbef' : '#eff3ff';
    } else { 
        // Palette Verte pour NDVI (High et Low)
        // NDVI est généralement entre 0 et 1 (ou parfois plus selon l'unité LAI)
        return d > 4 ? '#006837' : 
               d > 3 ? '#31a354' : 
               d > 2 ? '#78c679' :
               d > 1 ? '#addd8e' : 
               d > 0.5 ? '#d9f0a3' : '#ffffe5';
    }
}

// Applique le style à chaque région GeoJSON
function style(feature) {
    const selectedVar = document.getElementById('variable-select').value;
    const selectedYear = document.getElementById('year-select').value;
    
    // Récupération sécurisée de la donnée
    // On vérifie si 'data' existe, puis l'année, puis la variable
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
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

// --- 3. INTERACTION UTILISATEUR ---

// Survol de la souris
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

// Sortie de la souris
function resetHighlight(e) {
    geojsonLayer.resetStyle(e.target);
}

// Clic sur une région
function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
    
    const props = e.target.feature.properties;
    
    // 1. Trouver le nom de la région (dépend de votre Shapefile)
    // Essaie plusieurs noms de champs standards possibles
    const regionName = props.NAME_1 || props.Nom_Region || props.NOM_REGION || props.name || "Région inconnue";
    
    document.getElementById('region-name').innerText = regionName;

    // 2. Afficher la valeur numérique dans la boite info
    const selectedVar = document.getElementById('variable-select').value;
    const selectedYear = document.getElementById('year-select').value;
    
    let val = "--";
    if(props.data && props.data[selectedYear]) {
        val = props.data[selectedYear][selectedVar];
    }
    
    // Ajout de l'unité
    let unit = '';
    if(selectedVar === 'temp') unit = ' °C';
    if(selectedVar === 'precip') unit = ' mm';
    
    document.getElementById('region-value').innerText = val + unit;

    // 3. Mettre à jour le graphique
    updateChart(props, regionName);
}

// Attache les événements à chaque feature
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}

// --- 4. GRAPHIQUE (CHART.JS) ---

function updateChart(props, regionName) {
    const ctx = document.getElementById('myChart').getContext('2d');
    const years = ['2023', '2024', '2025'];

    // Extraction des données (avec sécurité si une année manque)
    const getDataArray = (variable) => {
        return years.map(y => {
            if (props.data && props.data[y]) {
                return props.data[y][variable];
            }
            return 0;
        });
    };

    const tempData = getDataArray('temp');
    const precipData = getDataArray('precip');
    const ndviHighData = getDataArray('ndvi_high');
    const ndviLowData = getDataArray('ndvi_low');

    // Destruction de l'ancien graphique s'il existe
    if (myChart) {
        myChart.destroy();
    }

    // Création du nouveau graphique
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Température (°C)',
                    data: tempData,
                    borderColor: '#FF6384',
                    backgroundColor: '#FF6384',
                    type: 'line',
                    yAxisID: 'y',
                    tension: 0.3
                },
                {
                    label: 'Précipitations (mm)',
                    data: precipData,
                    backgroundColor: '#36A2EB',
                    yAxisID: 'y1'
                },
                {
                    label: 'Végétation Haute (LAI)',
                    data: ndviHighData,
                    backgroundColor: '#4BC0C0',
                    yAxisID: 'y2' // Optionnel, ou mettre sur y
                },
                {
                    label: 'Végétation Basse (LAI)',
                    data: ndviLowData,
                    backgroundColor: '#FFCE56',
                    yAxisID: 'y2'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: `Données climatiques : ${regionName}`
                },
                tooltip: {
                    enabled: true
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Température (°C)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Précipitations (mm)' }
                },
                y2: {
                    display: false // On cache l'axe NDVI pour ne pas surcharger, mais les données sont là
                }
            }
        }
    });
}

// --- 5. CHARGEMENT DES DONNÉES RÉELLES ---

function initMap() {
    // C'est ici qu'on remplace les données simulées par le vrai fichier
    fetch('data_maroc.json')
        .then(response => {
            if (!response.ok) {
                throw new Error("Erreur HTTP " + response.status);
            }
            return response.json();
        })
        .then(data => {
            // Chargement réussi
            console.log("Données chargées :", data);

            if(geojsonLayer) map.removeLayer(geojsonLayer);

            geojsonLayer = L.geoJson(data, {
                style: style,
                onEachFeature: onEachFeature
            }).addTo(map);
            
            // Ajuster la vue pour englober tout le Maroc
            map.fitBounds(geojsonLayer.getBounds());
        })
        .catch(error => {
            console.error("Erreur lors du chargement du fichier JSON :", error);
            alert("Impossible de charger 'data_maroc.json'. Vérifiez qu'il est bien dans le dossier.");
        });
}

// Écouteurs pour mettre à jour la carte quand on change les menus déroulants
document.getElementById('variable-select').addEventListener('change', () => {
    if(geojsonLayer) geojsonLayer.setStyle(style);
});

document.getElementById('year-select').addEventListener('change', () => {
    if(geojsonLayer) geojsonLayer.setStyle(style);
});

// Démarrage
initMap();