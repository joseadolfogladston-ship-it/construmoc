// Menu Responsivo Toggle para telemóveis
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Fechar o menu ao clicar num link de navegação
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

// Funcionalidade de Lightbox para as imagens do portfólio
function openLightbox(imgSrc, title, desc) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDesc = document.getElementById('lightbox-desc');

    lightbox.style.display = 'flex';
    lightboxImg.src = imgSrc;
    lightboxTitle.textContent = title;
    lightboxDesc.textContent = desc;
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.style.display = 'none';
}

// Fechar com a tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeLightbox();
    }
});

// Validação e simulação de envio do formulário de orçamento
function enviarFormulario(event) {
    event.preventDefault();
    
    const nome = document.getElementById('nome').value;
    const servico = document.getElementById('servico').value;
    const alertBox = document.getElementById('formAlert');

    // Simulação de envio com sucesso
    alertBox.style.color = '#2e7d32';
    alertBox.textContent = `Obrigado, ${nome}! O seu pedido para o serviço "${servico}" foi enviado com sucesso. Entraremos em contacto brevemente.`;
    
    // Limpar o formulário
    document.getElementById('orcamentoForm').reset();

    setTimeout(() => {
        alertBox.textContent = '';
    }, 6000);
}