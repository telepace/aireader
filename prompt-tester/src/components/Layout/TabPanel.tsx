import React from 'react';
import { Box } from '@mui/material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  sx?: object;
}

/**
 * Renders a tab panel component that displays its children based on the active tab index.
 *
 * The TabPanel component uses the value and index props to determine whether to show or hide its children.
 * It applies specific styles to the Box component based on the active tab state, ensuring that only the
 * content of the currently selected tab is visible. Additional styles can be passed via the sx prop.
 *
 * @param {React.ReactNode} children - The content to be displayed within the tab panel.
 * @param {number} value - The currently active tab index.
 * @param {number} index - The index of the tab panel.
 * @param {object} sx - Additional styles to apply to the tab panel.
 * @param {object} other - Any other props to be passed to the Box component.
 */
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