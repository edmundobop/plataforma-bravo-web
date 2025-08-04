import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  DirectionsCar as CarIcon,
  Inventory as InventoryIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

const drawerWidth = 280;

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, canManageUsers } = useAuth();
  const { unreadCount } = useNotifications();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
    navigate('/login');
  };

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      roles: ['admin', 'gestor', 'operador'],
    },
    {
      text: 'Gestão de Frota',
      icon: <CarIcon />,
      path: '/frota',
      roles: ['admin', 'gestor', 'operador'],
    },
    {
      text: 'Almoxarifado',
      icon: <InventoryIcon />,
      path: '/almoxarifado',
      roles: ['admin', 'gestor', 'operador'],
    },
    {
      text: 'Cautelas',
      icon: <AssignmentIcon />,
      path: '/emprestimos',
      roles: ['admin', 'gestor', 'operador'],
    },
    {
      text: 'Operacional',
      icon: <ScheduleIcon />,
      path: '/operacional',
      roles: ['admin', 'gestor', 'operador'],
    },
    {
      text: 'Usuários',
      icon: <PeopleIcon />,
      path: '/usuarios',
      roles: ['admin', 'gestor'],
      show: canManageUsers(),
    },
  ];

  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  const drawer = (
    <Box>
      {/* Logo e título */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          backgroundColor: theme.palette.primary.main,
          color: 'white',
          minHeight: 64,
        }}
      >
        <Typography variant="h6" noWrap component="div" fontWeight="bold">
          CBMGO - Plataforma BRAVO
        </Typography>
      </Box>
      
      <Divider />
      
      {/* Menu de navegação */}
      <List sx={{ pt: 1 }}>
        {menuItems.map((item) => {
          if (item.show === false) return null;
          
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                selected={isActive(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.light,
                    color: 'white',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.main,
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive(item.path) ? 'white' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      
      <Divider sx={{ mt: 2 }} />
      
      {/* Informações do usuário */}
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Logado como:
        </Typography>
        <Typography variant="body1" fontWeight="medium">
          {user?.nome}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {user?.papel} - {user?.setor}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {/* Título da página atual */}
            {location.pathname === '/dashboard' && 'Dashboard'}
            {location.pathname.startsWith('/frota') && 'Gestão de Frota'}
            {location.pathname.startsWith('/almoxarifado') && 'Almoxarifado'}
            {location.pathname.startsWith('/emprestimos') && 'Cautelas'}
            {location.pathname.startsWith('/operacional') && 'Operacional'}
            {location.pathname.startsWith('/usuarios') && 'Usuários'}
            {location.pathname === '/perfil' && 'Meu Perfil'}
            {location.pathname === '/notificacoes' && 'Notificações'}
          </Typography>
          
          {/* Notificações */}
          <Tooltip title="Notificações">
            <IconButton
              color="inherit"
              onClick={() => navigate('/notificacoes')}
              sx={{ mr: 1 }}
            >
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          {/* Menu do usuário */}
          <Tooltip title="Minha conta">
            <IconButton
              color="inherit"
              onClick={handleProfileMenuOpen}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: theme.palette.secondary.main,
                  fontSize: '0.875rem',
                }}
              >
                {user?.nome?.charAt(0)?.toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      
      {/* Menu do perfil */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
        PaperProps={
          {
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }
        }
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => navigate('/perfil')}>
          <AccountIcon sx={{ mr: 1 }} />
          Meu Perfil
        </MenuItem>
        <MenuItem onClick={() => navigate('/notificacoes')}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon sx={{ mr: 1 }} />
          </Badge>
          Notificações
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1 }} />
          Sair
        </MenuItem>
      </Menu>
      
      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* Conteúdo principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Toolbar /> {/* Espaçamento para o AppBar */}
        <Box className="fade-in">
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;