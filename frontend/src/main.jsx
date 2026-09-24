import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './main.css';

function App() {
  return (
    <main>
      <h1>Full Stack Store</h1>
      <p>The storefront is ready for the first feature.</p>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
