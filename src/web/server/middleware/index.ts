import express from 'express';
import path from 'path';

/**
 * Middleware para servir archivos estáticos
 */
export function setupStaticMiddleware(app: express.Application): void {
    // Servir archivos estáticos (CSS, JS, imágenes)
    // Desde middleware/ necesitamos ir a ../../assets (web/assets)
    const assetsPath = path.join(__dirname, '../../assets');
    app.use('/assets', express.static(assetsPath));
    
    // Log para debugging
    console.log('📁 Static files served from:', assetsPath);
}

/**
 * Middleware básico de parsing
 */
export function setupBasicMiddleware(app: express.Application): void {
    // Middleware básico
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
}

/**
 * Setup completo de middleware
 */
export function setupMiddleware(app: express.Application): void {
    setupBasicMiddleware(app);
    setupStaticMiddleware(app);
}