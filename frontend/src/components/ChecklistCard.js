import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Avatar
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  LocalFireDepartment as FireIcon,
  LocalHospital as HospitalIcon,
  DirectionsCar as CarIcon
} from '@mui/icons-material';

const ChecklistCard = ({ checklist, onIniciar }) => {
  const getViaturaIcon = (tipo) => {
    switch (tipo) {
      case 'ABT':
      case 'ABTF':
      case 'ASA':
        return FireIcon;
      case 'UR':
        return HospitalIcon;
      default:
        return CarIcon;
    }
  };

  const IconComponent = getViaturaIcon(checklist.viatura_tipo);

  const getViaturaColor = (tipo) => {
    switch (tipo) {
      case 'ABT':
      case 'ABTF':
      case 'ASA':
        return '#f44336'; // Vermelho para combate
      case 'UR':
        return '#2196f3'; // Azul para socorro
      default:
        return '#757575'; // Cinza para outros
    }
  };

  const getTipoEspecialista = (tipo) => {
    return tipo === 'UR' ? 'Socorrista' : 'Combatente';
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4
        },
        border: '1px solid #e0e0e0'
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: getViaturaColor(checklist.viatura_tipo),
              mr: 2,
              width: 48,
              height: 48
            }}
          >
            {IconComponent ? <IconComponent /> : null}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
              {String(checklist.viatura_prefixo || 'Prefixo não disponível')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {String(`${checklist.viatura_marca || ''} ${checklist.viatura_modelo || ''}`.trim() || 'Marca/Modelo não disponível')}
            </Typography>
          </Box>
          <Chip
            icon={<AssignmentIcon />}
            label="Pendente"
            color="warning"
            size="small"
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Tipo de Viatura:
          </Typography>
          <Chip
            label={String(checklist.viatura_tipo || 'N/A')}
            size="small"
            sx={{ 
              bgcolor: getViaturaColor(checklist.viatura_tipo),
              color: 'white',
              mr: 1
            }}
          />
          <Chip
            label={getTipoEspecialista(checklist.viatura_tipo)}
            size="small"
            variant="outlined"
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Data do Checklist:
          </Typography>
          <Typography variant="body1">
            {checklist.data_checklist ? (() => {
              const date = new Date(checklist.data_checklist);
              return isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleDateString('pt-BR');
            })() : 'Data não disponível'}
          </Typography>
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Seções do Checklist:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Chip
              label="Motorista"
              size="small"
              variant="outlined"
              color="primary"
            />
            <Chip
              label={String(getTipoEspecialista(checklist.viatura_tipo))}
              size="small"
              variant="outlined"
              color="secondary"
            />
          </Box>
        </Box>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          startIcon={<AssignmentIcon />}
          onClick={() => onIniciar(checklist)}
          sx={{
            py: 1.5,
            fontWeight: 'bold',
            textTransform: 'none'
          }}
        >
          Iniciar Checklist
        </Button>
      </CardActions>
    </Card>
  );
};

export default ChecklistCard;