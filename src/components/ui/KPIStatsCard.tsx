

import React from 'react';
import { Card, CardContent, Typography, Box, useTheme, alpha } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

interface KPIStatsCardProps {
    title: string;
    value: string | number;
    trend?: string;
    trendType?: 'up' | 'down' | 'neutral';
    subtitle?: string;
}

const KPIStatsCard: React.FC<KPIStatsCardProps> = ({
    title,
    value,
    trend,
    trendType = 'neutral',
    subtitle
}) => {
    const theme = useTheme();

    const getTrendColor = () => {
        if (trendType === 'up') return theme.palette.success.main;
        if (trendType === 'down') return theme.palette.error.main;
        return theme.palette.text.disabled;
    };

    const TrendIcon = trendType === 'up' ? TrendingUp : TrendingDown;

    return (
        <Card sx={{ height: '100%', minWidth: 200 }}>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ mb: 2 }}
                >
                    {title}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <Typography variant="h4" fontWeight={700} color="text.primary">
                        {value}
                    </Typography>

                    {trend && (
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            color: getTrendColor(),
                            mb: 0.5
                        }}>
                            <Typography variant="caption" fontWeight={700}>
                                {trend}
                            </Typography>
                            {trendType !== 'neutral' && <TrendIcon sx={{ fontSize: 16 }} />}
                        </Box>
                    )}

                    {subtitle && !trend && (
                        <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ mb: 0.5 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export default KPIStatsCard;
