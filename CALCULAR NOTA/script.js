document.addEventListener('DOMContentLoaded', function() {
    const corte1Input = document.getElementById('corte1');
    const corte2Input = document.getElementById('corte2');
    const calcularBtn = document.getElementById('calcular');
    const resultadoDiv = document.getElementById('resultado');

    calcularBtn.addEventListener('click', function() {
        const corte1 = parseFloat(corte1Input.value);
        const corte2 = parseFloat(corte2Input.value);

        if (isNaN(corte1) || isNaN(corte2)) {
            mostrarError('Por favor, ingrese valores numéricos para ambos cortes.');
            return;
        }

        if (corte1 < 0 || corte1 > 5 || corte2 < 0 || corte2 > 5) {
            mostrarError('Las notas deben estar entre 0.0 y 5.0.');
            return;
        }

        const notaFinalNecesaria = calcularNotaFinal(corte1, corte2);

        if (notaFinalNecesaria > 5) {
            mostrarError('Imposible alcanzar 3.0. Necesitas más de 5.0 en la evaluación final. ¡Has perdido la materia!');
        } else if (notaFinalNecesaria < 0) {
            mostrarResultado('¡Felicidades! Ya tienes un promedio superior a 3.0, no necesitas presentar la evaluación final.');
        } else {
            mostrarResultado(`Necesitas obtener un ${notaFinalNecesaria.toFixed(2)} en la evaluación final para alcanzar 3.0.`);
        }
    });

    function calcularNotaFinal(corte1, corte2) {
        const porcentajeCorte1 = 0.30;
        const porcentajeCorte2 = 0.30;
        const porcentajeFinal = 0.40;
        const notaObjetivo = 3.0;

        const notaAcumulada = (corte1 * porcentajeCorte1) + (corte2 * porcentajeCorte2);
        const notaFinalNecesaria = (notaObjetivo - notaAcumulada) / porcentajeFinal;

        return notaFinalNecesaria;
    }

    function mostrarResultado(mensaje) {
        resultadoDiv.innerHTML = `<p>${mensaje}</p>`;
        resultadoDiv.classList.remove('error'); // Elimina la clase 'error' si existe
    }

    function mostrarError(mensaje) {
        resultadoDiv.innerHTML = `<p class="error">${mensaje}</p>`;
        resultadoDiv.classList.add('error'); // Agrega la clase 'error' para aplicar estilos de error
    }
});