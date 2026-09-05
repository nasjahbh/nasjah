/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import Budget from './pages/Budget';
import Expenses from './pages/Expenses';
import Setup from './pages/Setup';
import { isSupabaseConfigured } from './lib/supabase';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!isSupabaseConfigured ? <Navigate to="/setup" replace /> : <Login />} />
        <Route path="/setup" element={<Setup />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/expenses" element={<Expenses />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

