import React from 'react';
import { Box } from '@mui/material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  sx?: object;
}

const TabPanel: React.FC<TabPanelProps> = ({ 
  children, 
  value, 
  index, 
  sx, 
  ...other 
}) => {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      sx={{
        flexGrow: 1,
        ...(sx || {}),
        display: value === index ? 'flex' : 'none',
        ...(value !== index ? { height: 0, minHeight: 0, p: 0, m: 0, overflow: 'hidden' } : {}),
      }}
      {...other}
    >
      {value === index ? children : null}
    </Box>
  );
};

export default TabPanel;