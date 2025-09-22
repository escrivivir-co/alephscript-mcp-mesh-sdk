// Settings page JavaScript functionality

// Actualizar el selector cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Obtener el tema actual desde el backend
    fetch('/api/config')
        .then(response => response.json())
        .then(data => {
            const currentTheme = data.currentTheme;
            
            // Actualizar el nombre del tema actual
            const themeNameElement = document.querySelector('.current-theme-name');
            if (themeNameElement) {
                themeNameElement.textContent = currentTheme;
            }
            
            // Actualizar el selector
            const selector = document.querySelector('#theme');
            if (selector) {
                // Desmarcar todas las opciones
                Array.from(selector.options).forEach(option => {
                    option.selected = false;
                });
                
                // Marcar la opción actual
                const currentOption = selector.querySelector('option[value="' + currentTheme + '"]');
                if (currentOption) {
                    currentOption.selected = true;
                }
            }
            
            // Actualizar vista previa
            document.querySelectorAll('.theme-preview').forEach(preview => {
                preview.classList.remove('active');
                if (preview.dataset.theme === currentTheme) {
                    preview.classList.add('active');
                }
            });
        })
        .catch(error => console.error('Error loading current theme:', error));
});

// Manejar el envío del formulario para actualizar dinámicamente
document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.theme-selector-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const selectedTheme = formData.get('theme');
            
            console.log('Selected theme:', selectedTheme); // Debug log
            
            // Enviar el cambio de tema usando URLSearchParams
            const params = new URLSearchParams();
            params.append('theme', selectedTheme);
            
            fetch('/settings/theme', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString()
            })
            .then(response => {
                if (response.ok) {
                    // Actualizar la UI sin recargar la página
                    const themeNameElement = document.querySelector('.current-theme-name');
                    if (themeNameElement) {
                        themeNameElement.textContent = selectedTheme;
                    }
                    
                    // Actualizar vista previa
                    document.querySelectorAll('.theme-preview').forEach(preview => {
                        preview.classList.remove('active');
                        if (preview.dataset.theme === selectedTheme) {
                            preview.classList.add('active');
                        }
                    });
                    
                    // Recargar la página para aplicar el nuevo tema
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                } else {
                    console.error('Error applying theme');
                }
            })
            .catch(error => console.error('Error:', error));
        });
    }
});