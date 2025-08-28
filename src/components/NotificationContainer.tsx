import React from 'react';
import {
  Box,
  Alert,
  AlertTitle,
  IconButton,
  Button,
  Fade,
  Slide,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { Notification, NotificationConfig } from '../hooks/useNotification';

interface NotificationContainerProps {
  notifications: Notification[];
  config: NotificationConfig;
  onClose: (id: string) => void;
}

// 获取通知图标
const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return <CheckCircleIcon fontSize="small" />;
    case 'error':
      return <ErrorIcon fontSize="small" />;
    case 'warning':
      return <WarningIcon fontSize="small" />;
    case 'info':
    default:
      return <InfoIcon fontSize="small" />;
  }
};

// 获取Alert severity
const getSeverity = (type: Notification['type']): 'success' | 'error' | 'warning' | 'info' => {
  return type;
};

// 获取位置样式
const getPositionStyles = (position: NotificationConfig['position']) => {
  const baseStyles = {
    position: 'fixed' as const,
    zIndex: 1400,
    maxWidth: 400,
  };

  switch (position) {
    case 'top-right':
      return { ...baseStyles, top: 24, right: 24 };
    case 'top-left':
      return { ...baseStyles, top: 24, left: 24 };
    case 'bottom-right':
      return { ...baseStyles, bottom: 24, right: 24 };
    case 'bottom-left':
      return { ...baseStyles, bottom: 24, left: 24 };
    case 'center':
      return { 
        ...baseStyles, 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        maxWidth: 500 
      };
    default:
      return { ...baseStyles, top: 24, right: 24 };
  }
};

// 单个通知组件
interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
  index: number;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onClose, 
  index 
}) => {
  return (
    <Slide
      direction="left"
      in={true}
      timeout={{ enter: 300, exit: 200 }}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <Alert
        severity={getSeverity(notification.type)}
        icon={getNotificationIcon(notification.type)}
        action={
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ p: 0.5 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
        sx={{
          mb: 1,
          minWidth: 320,
          maxWidth: 400,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          '& .MuiAlert-message': {
            flexGrow: 1,
            pr: 1
          },
          '& .MuiAlert-action': {
            alignItems: 'flex-start',
            pt: 0.5
          }
        }}
      >
        <AlertTitle sx={{ mb: notification.message ? 0.5 : 0, fontSize: '0.875rem', fontWeight: 600 }}>
          {notification.title}
        </AlertTitle>
        
        {notification.message && (
          <Box sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: notification.actions ? 1 : 0 }}>
            {notification.message}
          </Box>
        )}
        
        {notification.actions && notification.actions.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            {notification.actions.map((action, actionIndex) => (
              <Button
                key={actionIndex}
                size="small"
                variant="text"
                color={action.color || 'primary'}
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                sx={{
                  fontSize: '0.75rem',
                  minWidth: 'auto',
                  px: 1,
                  py: 0.25,
                  textTransform: 'none'
                }}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        )}
      </Alert>
    </Slide>
  );
};

// 主容器组件
const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  config,
  onClose
}) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <Box sx={getPositionStyles(config.position)}>
      <Stack spacing={0}>
        {notifications.map((notification, index) => (
          <Fade
            key={notification.id}
            in={true}
            timeout={{ enter: 300, exit: 200 }}
          >
            <div>
              <NotificationItem
                notification={notification}
                onClose={() => onClose(notification.id)}
                index={index}
              />
            </div>
          </Fade>
        ))}
      </Stack>
    </Box>
  );
};

export default NotificationContainer;