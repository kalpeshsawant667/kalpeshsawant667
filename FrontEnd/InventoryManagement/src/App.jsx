import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import InventoryDashboard from './components/InventoryDashboard';
import LowStockAlert from './components/LowStockAlert';
import InventoryTransactions from './components/InventoryTransactions';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={<InventoryDashboard />} />
            <Route path="/low-stock" element={<LowStockAlert />} />
            <Route path="/transactions" element={<InventoryTransactions />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;