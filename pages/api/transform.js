import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Nur POST-Anfragen erlaubt' });
  }

  try {
    const form = formidable({ multiples: true });

    const { files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    const restrictedFile = files['restricted-zones']?.[0];
    const pedestrianFile = files['pedestrian-zones']?.[0];
    if (!restrictedFile || !pedestrianFile) {
      return res.status(400).json({ error: 'Bitte beide Dateien hochladen' });
    }

    let restrictedRaw, pedestrianRaw;
    try {
      restrictedRaw = JSON.parse(fs.readFileSync(restrictedFile.filepath, 'utf-8'));
    } catch (error) {
      return res.status(400).json({ error: 'restricted-zones-raw.geojson ist kein gültiges JSON: ' + error.message });
    }
    try {
      pedestrianRaw = JSON.parse(fs.readFileSync(pedestrianFile.filepath, 'utf-8'));
    } catch (error) {
      return res.status(400).json({ error: 'pedestrian-zones-raw.geojson ist kein gültiges JSON: ' + error.message });
    }

    const restrictedZones = restrictedRaw.features.map(feature => {
      const [lng, lat] = feature.geometry.coordinates;
      const type = feature.properties.amenity || feature.properties.leisure || 'unknown';
      const name = feature.properties.name || 'Unbekannt';
      return { lat, lng, radius: 100, type, name };
    });

    // Filtere ungültige Polygone (weniger als 3 Punkte)
    const pedestrianZones = pedestrianRaw.features
      .map(feature => ({
        type: 'pedestrian',
        coordinates: feature.geometry.coordinates
      }))
      .filter(zone => {
        const isValid = zone.coordinates[0].length >= 3;
        if (!isValid) {
          console.warn('Ungültiges Polygon gefiltert (weniger als 3 Punkte):', zone);
        }
        return isValid;
      });

    return res.status(200).json({
      message: `Erfolgreich verarbeitet: ${restrictedZones.length} restricted-zones, ${pedestrianZones.length} pedestrian-zones`,
      restrictedZones,
      pedestrianZones
    });
  } catch (error) {
    return res.status(500).json({ error: 'Serverfehler: ' + error.message });
  }
}
