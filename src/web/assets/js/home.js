/**
 * Home page interactivity
 * Mejora la experiencia de usuario en la página principal
 */
document.addEventListener('DOMContentLoaded', function() {
    // Añadir efectos de hover mejorados a las tarjetas principales
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
            this.style.zIndex = '10';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.zIndex = '1';
        });
    });

    // Añadir animación de entrada suave
    const sections = document.querySelectorAll('section');
    sections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        setTimeout(() => {
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, index * 200);
    });

    // Añadir indicador de carga para los enlaces principales
    const mainLinks = document.querySelectorAll('a[href="/ai"], a[href="/catalog"]');
    mainLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const originalText = this.textContent;
            this.textContent = '⏳ Cargando...';
            this.style.pointerEvents = 'none';
            
            // Restaurar si la navegación no funciona después de 3 segundos
            setTimeout(() => {
                this.textContent = originalText;
                this.style.pointerEvents = 'auto';
            }, 3000);
        });
    });

    // Añadir contador animado (si está disponible la API de stats)
    const animateCounter = (element, target) => {
        let current = 0;
        const increment = target / 60; // 1 segundo de animación a 60fps
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current);
        }, 16);
    };

    // Cargar stats básicos si están disponibles
    fetch('/api/status')
        .then(response => response.json())
        .then(data => {
            // Si hay datos, mostrar una pequeña estadística en la home
            if (data && data.status === 'healthy') {
                const statsHint = document.createElement('div');
                statsHint.innerHTML = `
                    <div style="
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        background: var(--success-color);
                        color: white;
                        padding: 0.5rem 1rem;
                        border-radius: 20px;
                        font-size: 0.8em;
                        font-weight: 600;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        z-index: 1000;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    ">
                        🟢 Sistema activo
                    </div>
                `;
                document.body.appendChild(statsHint);
                
                setTimeout(() => {
                    statsHint.firstElementChild.style.opacity = '1';
                }, 1000);
                
                // Auto-hide después de 5 segundos
                setTimeout(() => {
                    statsHint.firstElementChild.style.opacity = '0';
                    setTimeout(() => statsHint.remove(), 300);
                }, 6000);
            }
        })
        .catch(() => {
            // No hacer nada si no hay API disponible
        });
});