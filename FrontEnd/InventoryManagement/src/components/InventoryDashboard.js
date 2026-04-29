import React, { useState, useEffect } from 'react';
import {
  Container, Typography, TextField, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Box,
  Chip, CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions
} from '@mui/material';
import { Add, Edit, Delete, Inventory2 } from '@mui/icons-material';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const InventoryDashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [transactionType, setTransactionType] = useState('IN');

  useEffect(() => {
    fetchProducts();
    connectWebSocket();
  }, []);

  const ws = React.useRef(null);

  const connectWebSocket = () => {
    ws.current = new WebSocket('ws://localhost:8000/ws/inventory/');
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'inventory_update') {
        updateProductInList(data.product);
      }
    };

    ws.current.onclose = () => {
      setTimeout(connectWebSocket, 3000);
    };
  };

  const fetchProducts = async (searchTerm = '') => {
    try {
      const params = searchTerm ? { search: searchTerm } : {};
      const response = await axios.get('http://localhost:8000/api/products/', { params });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProductInList = (updatedProduct) => {
    setProducts(prevProducts => 
      prevProducts.map(product => 
        product.id === updatedProduct.id ? updatedProduct : product
      )
    );
  };

  const handleTransaction = async () => {
    try {
      await axios.post('http://localhost:8000/api/inventory-transactions/', {
        product_id: selectedProduct.id,
        type: transactionType,
        quantity: parseInt(quantity),
        reason: `Manual ${transactionType} adjustment`
      });
      setOpenDialog(false);
      setQuantity('');
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.sku.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockProducts = filteredProducts.filter(p => p.quantity <= p.low_stock_threshold);
  const chartData = filteredProducts.slice(0, 10).map(p => ({
    name: p.name.slice(0, 15),
    quantity: p.quantity,
    threshold: p.low_stock_threshold
  }));

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>
          Inventory Dashboard
        </Typography>
        
        {/* Search and Stats */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchProducts(e.target.value);
            }}
          />
          <Chip 
            icon={<Inventory2 />} 
            label={`${filteredProducts.length} items`} 
            color="primary" 
          />
          {lowStockProducts.length > 0 && (
            <Chip 
              label={`${lowStockProducts.length} low stock`} 
              color="warning" 
            />
          )}
        </Box>

        {/* Chart */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>Stock Levels (Top 10)</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" angle={-45} height={60} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantity" fill="#1976d2" name="Quantity" />
              <Bar dataKey="threshold" fill="#ff9800" name="Threshold" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        {/* Products Table */}
        <Paper sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} hover>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.category.name}</TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={product.quantity} 
                          color={product.quantity <= product.low_stock_threshold ? 'error' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">${product.price}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={product.quantity <= product.low_stock_threshold ? 'Low Stock' : 'OK'}
                          color={product.quantity <= product.low_stock_threshold ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button 
                          size="small"
                          onClick={() => {
                            setSelectedProduct(product);
                            setOpenDialog(true);
                          }}
                        >
                          Adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {/* Transaction Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Adjust {selectedProduct?.name}</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Transaction Type"
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            sx={{ mt: 2 }}
          >
            <option value="IN">Incoming (+)</option>
            <option value="OUT">Outgoing (-)</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </TextField>
          <TextField
            fullWidth
            label="Quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleTransaction} variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InventoryDashboard;