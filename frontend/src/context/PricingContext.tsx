import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { defaultPricingConfig } from '../types/pricingConfig';
import type { PricingConfig } from '../types/pricingConfig';
import type { ReactNode } from 'react';

interface PricingContextType {
    config: PricingConfig;
    loading: boolean;
    refreshConfig: () => void;
}

const PricingContext = createContext<PricingContextType>({
    config: defaultPricingConfig,
    loading: true,
    refreshConfig: () => { }
});

export const usePricing = () => useContext(PricingContext);

export const PricingProvider = ({ children }: { children: ReactNode }) => {
    const [config, setConfig] = useState<PricingConfig>(defaultPricingConfig);
    const [loading, setLoading] = useState(true);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/pricing');
            if (response.data) {
                const mergeConfig = (defaultConf: any, fetchedConf: any): any => {
                    const result = { ...defaultConf };
                    for (const key in fetchedConf) {
                        if (
                            typeof fetchedConf[key] === 'object' && 
                            fetchedConf[key] !== null && 
                            !Array.isArray(fetchedConf[key]) && 
                            key in defaultConf
                        ) {
                            result[key] = mergeConfig(defaultConf[key], fetchedConf[key]);
                        } else {
                            result[key] = fetchedConf[key];
                        }
                    }
                    return result;
                };
                setConfig(mergeConfig(defaultPricingConfig, response.data));
            }
        } catch (error) {
            console.error('Failed to fetch pricing config:', error);
            // Default config is already set, so we just proceed
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    return (
        <PricingContext.Provider value={{ config, loading, refreshConfig: fetchConfig }}>
            {children}
        </PricingContext.Provider>
    );
};
