import React from 'react';
import { Box, Card, CardContent, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const HistoricoFuncionalManutencao = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Histórico Funcional temporariamente desativado
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Esta tela está em manutenção no momento. Tente novamente mais tarde.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" color="primary" onClick={() => navigate('/dashboard')}>
              Ir para o Dashboard
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default HistoricoFuncionalManutencao;