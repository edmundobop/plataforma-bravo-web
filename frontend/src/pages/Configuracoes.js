import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, FormGroup, FormControlLabel, Checkbox, Button, Chip } from '@mui/material';
import { almoxarifadoService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

const perfis = ['Administrador', 'Comandante', 'Chefe', 'Auxiliar', 'Operador'];
const intervalos = [30, 7, 2, 1];

const Configuracoes = () => {
  const { user } = useAuth();
  const { currentUnit } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState(['Administrador', 'Chefe', 'Comandante']);
  const [intervalSel, setIntervalSel] = useState([7, 2, 1]);
  const [saved, setSaved] = useState(false);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const resp = await almoxarifadoService.getConfig();
      const data = resp.data || {};
      setRoles(data.cautelas_autorizacao_roles || ['Administrador', 'Chefe', 'Comandante']);
      setIntervalSel(data.cautelas_notificacao_intervals || [7, 2, 1]);
      setSaved(false);
      setError('');
    } catch (e) {
      setRoles(['Administrador', 'Chefe', 'Comandante']);
      setIntervalSel([7, 2, 1]);
      setSaved(false);
      const status = e?.response?.status;
      const msg = e?.response?.data?.error || 'Erro ao carregar configurações';
      setError(status ? `${msg} (HTTP ${status})` : msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConfig(); }, [currentUnit?.id]);

  const toggleRole = (role) => {
    setRoles((prev) => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    setSaved(false);
  };
  const toggleInterval = (val) => {
    setIntervalSel((prev) => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
    setSaved(false);
  };

  const save = async () => {
    try {
      setLoading(true);
      await almoxarifadoService.updateConfig({
        cautelas_autorizacao_roles: roles,
        cautelas_notificacao_intervals: intervalSel.sort((a,b)=>a-b),
      });
      setSaved(true);
      setError('');
    } catch (e) {
      setError('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">Configurações</Typography>
        <Typography variant="body1" color="textSecondary">Preferências do módulo de Almoxarifado</Typography>
      </Box>
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Cautelas</Typography>
          <Typography variant="subtitle1" gutterBottom>Quem Pode Autorizar</Typography>
          <FormGroup row>
            {perfis.map((p) => (
              <FormControlLabel
                key={p}
                control={<Checkbox checked={roles.includes(p)} onChange={() => toggleRole(p)} />}
                label={p}
              />
            ))}
          </FormGroup>
          <Box mt={2}>
            <Typography variant="subtitle1" gutterBottom>Notificação de Devoluções</Typography>
            <FormGroup row>
              {intervalos.map((d) => (
                <FormControlLabel
                  key={`int-${d}`}
                  control={<Checkbox checked={intervalSel.includes(d)} onChange={() => toggleInterval(d)} />}
                  label={`${d} dias`}
                />
              ))}
            </FormGroup>
            <Box mt={1}>
              <Typography variant="caption" color="textSecondary">Selecionados:</Typography>
              <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                {intervalSel.sort((a,b)=>a-b).map((d) => <Chip key={`sel-${d}`} label={`${d} dias`} size="small" />)}
              </Box>
            </Box>
          </Box>
          <Box mt={3} display="flex" gap={2}>
            <Button variant="contained" color="primary" onClick={save} disabled={loading}>Salvar</Button>
            <Button variant="outlined" onClick={loadConfig} disabled={loading}>Reverter</Button>
            {saved && <Typography variant="body2" color="success.main">Configurações salvas</Typography>}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Configuracoes;
