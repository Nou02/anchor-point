




const Weather = () => {
  // Make the iframe fill the parent (main content), not the whole viewport
  return (
    <div
      className="weather-iframe-bg"
      style={{
        height: 'calc(100vh - 32px)',
        width: '100%',
        padding: 0,
        margin: 0,
        background: '#eaf2ff',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}
    >
      <iframe
        src="https://storage.googleapis.com/gmp-maps-demos/weather-api/index.html#current-conditions"
        title="Weather Demo"
        width="100%"
        height="1200"
        style={{ border: 'none', width: '100%', minHeight: '600px', height: '1200px', background: '#eaf2ff', display: 'block' }}
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default Weather;
