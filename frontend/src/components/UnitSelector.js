import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Chip,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Business as BusinessIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';

const UnitSelector = () => {
  const { user } = useAuth();
  const {
    currentUnit,
    availableUnits,
    loading,
    switchUnit,
    isCurrentUnit,
    getUserRole,
    isLotacaoUnit,
  } = useTenant();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleUnitSwitch = async (unitId) => {
    if (isCurrentUnit(unitId)) {
      handleClose();
      return;
    }

    setSwitching(true);
    const result = await switchUnit(unitId);
    setSwitching(false);
    handleClose();

    if (result.success) {
      setNotification({
        open: true,
        message: `Unidade alterada para: ${result.unit.nome}`,
        severity: 'success'
      });
    } else {
      setNotification({
        open: true,
        message: result.error || 'Erro ao trocar unidade',
        severity: 'error'
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  if (loading || !currentUnit) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} color="inherit" />
        <Typography variant="body2" color="inherit">
          Carregando...
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Button
        onClick={handleClick}
        color="inherit"
        endIcon={<ExpandMoreIcon />}
        sx={{
          textTransform: 'none',
          color: 'inherit',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
        disabled={switching}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon fontSize="small" />
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
              {currentUnit.sigla || currentUnit.nome}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1 }}>
              {currentUnit.tipo}
            </Typography>
          </Box>
          {isLotacaoUnit() && (
            <Chip
              label="Lotação"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'inherit',
              }}
            />
          )}
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1,
            minWidth: 280,
            maxWidth: 400,
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1.5,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1, backgroundColor: 'grey.50' }}>
          <Typography variant="subtitle2" color="textSecondary">
            Selecionar Unidade
          </Typography>
        </Box>
        
        <Divider />
        
        {availableUnits.map((unit) => {
          const isCurrent = isCurrentUnit(unit.id);
          const role = getUserRole(unit.id);
          const isLotacao = unit.id === user?.unidade_id;
          
          return (
            <MenuItem
              key={unit.id}
              onClick={() => handleUnitSwitch(unit.id)}
              selected={isCurrent}
              sx={{
                backgroundColor: isCurrent ? 'action.selected' : 'transparent',
                '&:hover': {
                  backgroundColor: isCurrent ? 'action.selected' : 'action.hover',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {isCurrent ? (
                  <CheckIcon color="primary" fontSize="small" />
                ) : isLotacao ? (
                  <HomeIcon color="action" fontSize="small" />
                ) : (
                  <BusinessIcon color="action" fontSize="small" />
                )}
              </ListItemIcon>
              
              <ListItemText
                primary={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Typography component="span" variant="body2" sx={{ fontWeight: isCurrent ? 500 : 400 }}>
                      {unit.nome}
                    </Typography>
                    {isLotacao && (
                      <Chip
                        label="Lotação"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    )}
                  </span>
                }
                secondary={
                  <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography component="span" variant="caption" color="textSecondary">
                      {unit.tipo} • {(unit.sigla || unit.codigo || '')}
                    </Typography>
                    {role && (
                      <Chip
                        label={role.toUpperCase()}
                        size="small"
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.6rem' }}
                      />
                    )}
                  </span>
                }
              />
            </MenuItem>
          );
        })}
        
        {availableUnits.length === 0 && (
          <MenuItem key="no-units" disabled>
            <ListItemText
              primary="Nenhuma unidade disponível"
              secondary="Entre em contato com o administrador"
            />
          </MenuItem>
        )}
      </Menu>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default UnitSelector;