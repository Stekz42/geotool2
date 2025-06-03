import { useState } from 'react';

export default function Home() {
  const [restrictedFile, setRestrictedFile] = useState(null);
  const [pedestrianFile, setPedestrianFile] = useState(null);
  const [message, setMessage] = useState('');
  const [downloadLinks, setDownloadLinks] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!restrictedFile || !pedestrianFile) {
      setMessage('Bitte beide Dateien auswählen');
      return;
    }

    const maxSize = 4.5 * 1024 * 1024;
    if (restrictedFile.size > maxSize || pedestrianFile.size > maxSize) {
      setMessage('Fehler: Eine der Dateien ist zu groß (max. 4.5 MB).');
      return;
    }

    const formData = new FormData();
    formData.append('restricted-zones', restrictedFile);
    formData.append('pedestrian-zones', pedestrianFile);

    setMessage('Verarbeite...');
    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        body: formData
      });

      if (response.status === 413) {
        setMessage('Fehler: Dateien sind zu groß für Vercel (max. 4.5 MB).');
        return;
      }

      const text = await response.text();
      if (!text) {
        setMessage('Fehler: Leere Antwort von der API erhalten.');
        return;
      }

      const data = JSON.parse(text);
      if (response.ok) {
        setMessage(data.message);

        const restrictedBlob = new Blob([JSON.stringify(data.restrictedZones, null, 2)], { type: 'application/json' });
        const pedestrianBlob = new Blob([JSON.stringify(data.pedestrianZones, null, 2)], { type: 'application/json' });

        const restrictedUrl = URL.createObjectURL(restrictedBlob);
        const pedestrianUrl = URL.createObjectURL(pedestrianBlob);

        setDownloadLinks({
          restricted: restrictedUrl,
          pedestrian: pedestrianUrl
        });
      } else {
        setMessage(data.error || 'Ein Fehler ist aufgetreten');
      }
    } catch (error) {
      setMessage('Fehler: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px',
