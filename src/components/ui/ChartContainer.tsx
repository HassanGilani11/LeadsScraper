

import React from 'react';
import { Card, CardContent, Typography, Box, Button, alpha, useTheme } from '@mui/material';

interface ChartContainerProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
    title,
    subtitle,
    children,
    actions
}) => {
    const theme = useTheme();

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: { xs: 3, md: 4 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box>
                        <Typography variant="h6" fontWeight={700} color="text.primary">
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography variant="body2" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {actions}
                    </Box>
                </Box>
                <Box sx={{ flexGrow: 1, minHeight: 0, position: 'relative' }}>
                    {children}
                </Box>
            </CardContent>
        </Card>
    );
};

export default ChartContainer;
