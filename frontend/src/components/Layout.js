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
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  DirectionsCar as CarIcon,
  Assignment as ChecklistIcon,
  Inventory as InventoryIcon,
  Work as WorkIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountIcon,
  ExitToApp as LogoutIcon,
  ExpandLess,
  ExpandMore,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  Assessment as AssessmentIcon,
  DirectionsCar as ViaturasIcon,
  Build as BuildIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  PersonAdd as PersonAddIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  Business as BusinessIcon,
  AccountTree as AccountTreeIcon,
  BarChart as BarChartIcon,
  AdminPanelSettings as AdminPanelSettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import UnitSelector from './UnitSelector';

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
  const [frotaExpanded, setFrotaExpanded] = useState(false);
  const [almoxarifadoExpanded, setAlmoxarifadoExpanded] = useState(false);
  const [gestaoPessoasExpanded, setGestaoPessoasExpanded] = useState(false);
  const [usuariosExpanded, setUsuariosExpanded] = useState(false);
  const [estruturaExpanded, setEstruturaExpanded] = useState(false);

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
      roles: ['Administrador', 'Chefe', 'Operador'],
    },
    {
      text: 'Gestão de Frota',
      icon: <CarIcon />,
      path: '/frota',
      roles: ['Administrador', 'Chefe', 'Operador'],
      hasSubmenu: true,
      submenu: [
        {
          text: 'Dashboard',
          icon: <AssessmentIcon />,
          path: '/frota/dashboard',
          roles: ['Administrador', 'Chefe', 'Operador'],
        },
        {
          text: 'Viaturas',
          icon: <ViaturasIcon />,
          path: '/frota/viaturas',
          roles: ['Administrador', 'Chefe', 'Operador'],
        },
        {
          text: 'Manutenções',
          icon: <BuildIcon />,
          path: '/frota/manutencoes',
          roles: ['Administrador', 'Chefe', 'Operador'],
          },
          {
            text: 'Checklists',
          icon: <ChecklistIcon />,
          path: '/frota/checklists',
          roles: ['Administrador', 'Chefe', 'Operador'],
          },
      ],
    },
    {
      text: 'Almoxarifado',
      icon: <InventoryIcon />,
      path: '/almoxarifado',
      roles: ['Administrador', 'Chefe', 'Operador'],
      hasSubmenu: true,
      submenu: [
        {
          text: 'Produtos',
          icon: <InventoryIcon />,
          path: '/almoxarifado',
          roles: ['Administrador', 'Chefe', 'Operador'],
        },
        {
          text: 'Cautelas',
          icon: <AssignmentIcon />,
          path: '/emprestimos',
          roles: ['Administrador', 'Chefe', 'Operador'],
        },
      ],
    },
    {
      text: 'Operacional',
      icon: <ScheduleIcon />,
      path: '/operacional',
      roles: ['Administrador', 'Chefe', 'Operador'],
    },
    {
      text: 'Gestão de Pessoas',
      icon: <PeopleIcon />,
      path: '/gestao-pessoas',
      roles: ['Administrador', 'Chefe'],
      show: canManageUsers(),
      hasSubmenu: true,
      submenu: [
        {
          text: 'Usuários',
          icon: <PeopleIcon />,
          path: '/usuarios',
          roles: ['Administrador', 'Chefe'],
          hasSubmenu: true,
          submenu: [
            {
              text: 'Cadastro de Militares',
              icon: <PersonAddIcon />,
              path: '/gestao-pessoas/cadastro-militares',
              roles: ['Administrador', 'Administrador'],
            },
            {
              text: 'Aprovação de Cadastros',
              icon: <AdminPanelSettingsIcon />,
              path: '/gestao-pessoas/aprovacao-cadastros',
              roles: ['Administrador'],
            },
            {
              text: 'Perfis e Permissões',
              icon: <SecurityIcon />,
              path: '/usuarios/perfis',
              roles: ['Administrador'],
              show: false,
            },
            {
              text: 'Histórico Funcional',
              icon: <HistoryIcon />,
              path: '/usuarios/historico',
              roles: ['Administrador', 'Chefe'],
            },
          ],
        },
        {
          text: 'Estrutura Organizacional',
          icon: <BusinessIcon />,
          path: '/estrutura',
          roles: ['Administrador', 'Chefe'],
          hasSubmenu: true,
          submenu: [
            {
              text: 'Unidades',
              icon: <BusinessIcon />,
              path: '/estrutura/unidades',
              roles: ['Administrador', 'Chefe'],
            },
            {
              text: 'Hierarquia',
              icon: <AccountTreeIcon />,
              path: '/estrutura/hierarquia',
              roles: ['Administrador', 'Chefe'],
            },
          ],
        },
        {
          text: 'Relatórios de Pessoal',
          icon: <BarChartIcon />,
          path: '/relatorios-pessoal',
          roles: ['Administrador', 'Chefe'],
        },
      ],
    },
  ];

  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  const handleFrotaClick = () => {
    setFrotaExpanded(!frotaExpanded);
  };

  const handleAlmoxarifadoClick = () => {
    setAlmoxarifadoExpanded(!almoxarifadoExpanded);
  };

  const handleGestaoPessoasClick = () => {
    setGestaoPessoasExpanded(!gestaoPessoasExpanded);
  };

  const handleUsuariosClick = () => {
    setUsuariosExpanded(!usuariosExpanded);
  };

  const handleEstruturaClick = () => {
    setEstruturaExpanded(!estruturaExpanded);
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
            <React.Fragment key={item.text}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => {
                    if (item.hasSubmenu) {
                      if (item.text === 'Gestão de Frota') {
                        handleFrotaClick();
                      } else if (item.text === 'Almoxarifado') {
                        handleAlmoxarifadoClick();
                      } else if (item.text === 'Gestão de Pessoas') {
                        handleGestaoPessoasClick();
                      }
                    } else {
                      navigate(item.path);
                      if (isMobile) setMobileOpen(false);
                    }
                  }}
                  selected={isActive(item.path) && !item.hasSubmenu}
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
                      color: isActive(item.path) && !item.hasSubmenu ? 'white' : 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                  {item.hasSubmenu && (
                    item.text === 'Gestão de Frota' ? (
                      frotaExpanded ? <ExpandLess /> : <ExpandMore />
                    ) : item.text === 'Almoxarifado' ? (
                      almoxarifadoExpanded ? <ExpandLess /> : <ExpandMore />
                    ) : item.text === 'Gestão de Pessoas' ? (
                      gestaoPessoasExpanded ? <ExpandLess /> : <ExpandMore />
                    ) : null
                  )}
                </ListItemButton>
              </ListItem>
              
              {/* Submenu */}
              {item.hasSubmenu && item.text === 'Gestão de Frota' && (
                <Collapse in={frotaExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.submenu.map((subItem) => (
                      <ListItem key={subItem.text} disablePadding>
                        <ListItemButton
                          onClick={() => {
                            navigate(subItem.path);
                            if (isMobile) setMobileOpen(false);
                          }}
                          selected={isActive(subItem.path)}
                          sx={{
                            pl: 4,
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
                              color: isActive(subItem.path) ? 'white' : 'inherit',
                              minWidth: 40,
                            }}
                          >
                            {subItem.icon}
                          </ListItemIcon>
                          <ListItemText primary={subItem.text} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              )}
              
              {/* Submenu Almoxarifado */}
              {item.hasSubmenu && item.text === 'Almoxarifado' && (
                <Collapse in={almoxarifadoExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.submenu.map((subItem) => (
                      <ListItem key={subItem.text} disablePadding>
                        <ListItemButton
                          onClick={() => {
                            navigate(subItem.path);
                            if (isMobile) setMobileOpen(false);
                          }}
                          selected={isActive(subItem.path)}
                          sx={{
                            pl: 4,
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
                              color: isActive(subItem.path) ? 'white' : 'inherit',
                              minWidth: 40,
                            }}
                          >
                            {subItem.icon}
                          </ListItemIcon>
                          <ListItemText primary={subItem.text} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              )}

              {/* Submenu Gestão de Pessoas */}
              {item.hasSubmenu && item.text === 'Gestão de Pessoas' && (
                <Collapse in={gestaoPessoasExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.submenu.map((subItem) => (
                      <React.Fragment key={subItem.text}>
                        <ListItem disablePadding>
                          <ListItemButton
                            onClick={() => {
                              if (subItem.hasSubmenu) {
                                if (subItem.text === 'Usuários') {
                                  handleUsuariosClick();
                                } else if (subItem.text === 'Estrutura Organizacional') {
                                  handleEstruturaClick();
                                }
                              } else {
                                navigate(subItem.path);
                                if (isMobile) setMobileOpen(false);
                              }
                            }}
                            selected={isActive(subItem.path) && !subItem.hasSubmenu}
                            sx={{
                              pl: 4,
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
                                color: isActive(subItem.path) && !subItem.hasSubmenu ? 'white' : 'inherit',
                                minWidth: 40,
                              }}
                            >
                              {subItem.icon}
                            </ListItemIcon>
                            <ListItemText primary={subItem.text} />
                            {subItem.hasSubmenu && (
                              subItem.text === 'Usuários' ? (
                                usuariosExpanded ? <ExpandLess /> : <ExpandMore />
                              ) : subItem.text === 'Estrutura Organizacional' ? (
                                estruturaExpanded ? <ExpandLess /> : <ExpandMore />
                              ) : null
                            )}
                          </ListItemButton>
                        </ListItem>

                        {/* Sub-submenu Usuários */}
                        {subItem.hasSubmenu && subItem.text === 'Usuários' && (
                          <Collapse in={usuariosExpanded} timeout="auto" unmountOnExit>
                            <List component="div" disablePadding>
                              {subItem.submenu
                                .filter((s) => s.show !== false)
                                .map((subSubItem) => (
                                <ListItem key={subSubItem.text} disablePadding>
                                  <ListItemButton
                                    onClick={() => {
                                      navigate(subSubItem.path);
                                      if (isMobile) setMobileOpen(false);
                                    }}
                                    selected={isActive(subSubItem.path)}
                                    sx={{
                                      pl: 6,
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
                                        color: isActive(subSubItem.path) ? 'white' : 'inherit',
                                        minWidth: 40,
                                      }}
                                    >
                                      {subSubItem.icon}
                                    </ListItemIcon>
                                    <ListItemText primary={subSubItem.text} />
                                  </ListItemButton>
                                </ListItem>
                              ))}
                            </List>
                          </Collapse>
                        )}

                        {/* Sub-submenu Estrutura Organizacional */}
                        {subItem.hasSubmenu && subItem.text === 'Estrutura Organizacional' && (
                          <Collapse in={estruturaExpanded} timeout="auto" unmountOnExit>
                            <List component="div" disablePadding>
                              {subItem.submenu.map((subSubItem) => (
                                <ListItem key={subSubItem.text} disablePadding>
                                  <ListItemButton
                                    onClick={() => {
                                      navigate(subSubItem.path);
                                      if (isMobile) setMobileOpen(false);
                                    }}
                                    selected={isActive(subSubItem.path)}
                                    sx={{
                                      pl: 6,
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
                                        color: isActive(subSubItem.path) ? 'white' : 'inherit',
                                        minWidth: 40,
                                      }}
                                    >
                                      {subSubItem.icon}
                                    </ListItemIcon>
                                    <ListItemText primary={subSubItem.text} />
                                  </ListItemButton>
                                </ListItem>
                              ))}
                            </List>
                          </Collapse>
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
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
            {location.pathname === '/frota' && 'Gestão de Frota'}
            {location.pathname.startsWith('/frota/viaturas') && 'Viaturas'}
            {location.pathname.startsWith('/almoxarifado') && 'Almoxarifado'}
            {location.pathname.startsWith('/emprestimos') && 'Cautelas'}
            {location.pathname.startsWith('/operacional') && 'Operacional'}
            {location.pathname.startsWith('/usuarios') && 'Usuários'}
            {location.pathname === '/perfil' && 'Meu Perfil'}
            {location.pathname === '/notificacoes' && 'Notificações'}
          </Typography>
          
          {/* Seletor de Unidades */}
          <UnitSelector />
          
          {/* Notificações */}
          <Tooltip title="Notificações">
            <IconButton
              color="inherit"
              onClick={() => navigate('/notificacoes')}
              sx={{ mr: 1, ml: 2 }}
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
        <MenuItem key="perfil" onClick={() => navigate('/perfil')}>
          <AccountIcon sx={{ mr: 1 }} />
          Meu Perfil
        </MenuItem>
        <MenuItem key="notificacoes" onClick={() => navigate('/notificacoes')}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon sx={{ mr: 1 }} />
          </Badge>
          Notificações
        </MenuItem>
        <Divider />
        <MenuItem key="logout" onClick={handleLogout}>
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
          px: { xs: 1.5, md: 3 },
          py: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          maxWidth: '100%',
          overflowX: 'hidden',
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
