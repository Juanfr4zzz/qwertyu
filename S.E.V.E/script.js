document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const configSection = document.getElementById('config-section');
    const candidateConfigSection = document.getElementById('candidate-config-section');
    const votingSection = document.getElementById('voting-section');
    const resultsSection = document.getElementById('results-section');

    const numVotersInput = document.getElementById('num-voters');
    const numCandidatesInput = document.getElementById('num-candidates');
    const startConfigCandidatesBtn = document.getElementById('start-config-candidates');
    const candidateFormsContainer = document.getElementById('candidate-forms-container');
    const startVotingBtn = document.getElementById('start-voting-button');

    const timerDisplay = document.getElementById('timer');
    const votesCastDisplay = document.getElementById('votes-cast');
    const totalVotersDisplay = document.getElementById('total-voters');
    const candidatesDisplay = document.getElementById('candidates-display');

    const resultsChartCanvas = document.getElementById('results-chart');
    const winnerAnnouncement = document.getElementById('winner-announcement');
    const detailedResultsList = document.getElementById('detailed-results');

    const verificationModal = document.getElementById('verification-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const candidateToVoteSpan = document.getElementById('candidate-to-vote');
    const verificationCodeInput = document.getElementById('verification-code');
    const confirmVoteBtn = document.getElementById('confirm-vote-button');
    const cancelVoteBtn = document.getElementById('cancel-vote-button');
    const verificationError = document.getElementById('verification-error');

    // --- State Variables ---
    let maxVoters = 0;
    let candidates = []; // Array to hold { id, name, proposals, imageSrc, votes }
    let votesCast = 0;
    let timeLeft = 10 * 60; // 10 minutes in seconds
    let timerInterval = null;
    let votingActive = false;
    const correctVerificationCode = "1424";
    let candidateToVerify = null; // Holds the candidate object being voted for
    let chartInstance = null; // To hold the Chart.js instance

    // --- Event Listeners ---
    startConfigCandidatesBtn.addEventListener('click', setupCandidateConfiguration);
    startVotingBtn.addEventListener('click', startVoting);
    closeModalBtn.addEventListener('click', closeModal);
    cancelVoteBtn.addEventListener('click', closeModal);
    confirmVoteBtn.addEventListener('click', processVoteVerification);
    window.addEventListener('click', (event) => {
        if (event.target == verificationModal) {
            closeModal();
        }
    });
    verificationCodeInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          confirmVoteBtn.click();
        }
    });


    // --- Functions ---

    // Phase 1: Initial Setup
    function setupCandidateConfiguration() {
        maxVoters = parseInt(numVotersInput.value);
        const numCandidates = parseInt(numCandidatesInput.value);

        if (isNaN(maxVoters) || maxVoters <= 0 || isNaN(numCandidates) || numCandidates <= 0) {
            alert("Por favor, introduce números válidos para votantes y candidatos.");
            return;
        }

        totalVotersDisplay.textContent = maxVoters;
        generateCandidateForms(numCandidates);
        switchSection(candidateConfigSection);
    }

    // Phase 2: Candidate Configuration Form Generation
    function generateCandidateForms(numCandidates) {
        candidateFormsContainer.innerHTML = '';
        for (let i = 0; i < numCandidates; i++) {
            // Usamos una imagen placeholder local por defecto
            const placeholderImg = 'images/placeholder.png';
            const formHtml = `
                <div class="candidate-form card" data-candidate-id="${i}">
                    <h3>Candidato ${i + 1}</h3>
                    <div class="form-group">
                        <label for="candidate-name-${i}">Nombre del Candidato:</label>
                        <input type="text" id="candidate-name-${i}" required>
                    </div>
                    <div class="form-group">
                        <label for="candidate-proposals-${i}">Breve Resumen de Propuestas:</label>
                        <textarea id="candidate-proposals-${i}" rows="3" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="candidate-image-${i}">Foto del Candidato:</label>
                        <input type="file" id="candidate-image-${i}" accept="image/*"> <!-- No 'required' aquí, validaremos en JS -->
                        <img id="image-preview-${i}" src="${placeholderImg}" alt="Vista previa" class="image-preview" onerror="this.src='${placeholderImg}'; this.style.border='1px solid red';">
                        <small><i>Se recomienda imagen cuadrada (ej. 300x300px)</i></small>
                    </div>
                </div>
            `;
            candidateFormsContainer.insertAdjacentHTML('beforeend', formHtml);

            const imageInput = document.getElementById(`candidate-image-${i}`);
            const previewImg = document.getElementById(`image-preview-${i}`);
            imageInput.addEventListener('change', (event) => handleImageUpload(event, previewImg));
        }
    }

    function handleImageUpload(event, previewElement) {
        const file = event.target.files[0];
        const placeholderImg = 'images/placeholder.png';
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewElement.src = e.target.result;
                previewElement.style.border = '1px solid #ddd'; // Reset border on successful load
            }
            reader.onerror = function() {
                 previewElement.src = placeholderImg; // Fallback on reader error
                 previewElement.style.border = '1px solid red';
            }
            reader.readAsDataURL(file);
        } else {
            previewElement.src = placeholderImg; // Reset if no file or invalid file
             // Reset border if input is cleared or non-image selected
             previewElement.style.border = event.target.files.length === 0 ? '1px solid #ddd' : '1px solid red';
        }
    }

    // Phase 3: Start Voting
    function startVoting() {
        if (!collectCandidateData()) {
             alert("Por favor, completa todos los campos para cada candidato, incluyendo nombre, propuestas y una imagen válida (no el placeholder).");
            return;
        }

        displayCandidates();
        startTimer();
        votingActive = true;
        switchSection(votingSection);
    }

    function collectCandidateData() {
        candidates = [];
        const candidateForms = candidateFormsContainer.querySelectorAll('.candidate-form');
        let allDataValid = true;
        const placeholderSrcEnd = 'images/placeholder.png'; // Check against this

        candidateForms.forEach((form, index) => {
            const id = index;
            const nameInput = form.querySelector(`#candidate-name-${id}`);
            const proposalsInput = form.querySelector(`#candidate-proposals-${id}`);
            const imageInput = form.querySelector(`#candidate-image-${id}`); // Get the input itself
            const imagePreview = form.querySelector(`#image-preview-${id}`); // Get the preview img

            const name = nameInput.value.trim();
            const proposals = proposalsInput.value.trim();
            const imageSrc = imagePreview.src; // Current source of the preview

            let isDataValid = true;
            // Validation: name and proposals must not be empty
            if (!name) {
                 nameInput.style.borderColor = 'red';
                 isDataValid = false;
            } else {
                nameInput.style.borderColor = '';
            }
            if (!proposals) {
                proposalsInput.style.borderColor = 'red';
                 isDataValid = false;
            } else {
                proposalsInput.style.borderColor = '';
            }

            // Validation: image must have been selected and loaded (not the placeholder)
            // Check if src ends with placeholder OR if the file input is empty (meaning placeholder is shown)
             if (imageSrc.endsWith(placeholderSrcEnd) || imageInput.files.length === 0) {
                 imagePreview.style.border = '1px solid red'; // Highlight preview if invalid
                 isDataValid = false;
             } else {
                 imagePreview.style.border = '1px solid #ddd'; // Reset border if valid
             }


            if (!isDataValid) {
                allDataValid = false; // Mark overall validity as false if any candidate fails
            }

            candidates.push({
                id: id,
                name: name,
                proposals: proposals,
                imageSrc: imageSrc, // Use the potentially updated preview src
                votes: 0
            });
        });
         return allDataValid; // Return overall validity
    }


    function displayCandidates() {
        candidatesDisplay.innerHTML = '';
        candidates.forEach(candidate => {
             // --- CAMBIO: Botón de Voto movido al .card-back ---
            const cardHtml = `
                <div class="candidate-card">
                    <div class="card-inner">
                        <div class="card-front">
                            <img src="${candidate.imageSrc}" alt="Foto de ${candidate.name}" class="candidate-img">
                            <h3 class="candidate-name">${candidate.name}</h3>
                            <!-- Botón de voto eliminado de aquí -->
                        </div>
                        <div class="card-back">
                            <h4>Propuestas de ${candidate.name}</h4>
                            <p>${candidate.proposals.replace(/\n/g, '<br>')}</p>
                            <button class="btn btn-vote" data-candidate-id="${candidate.id}" ${!votingActive && votesCast > 0 ? 'disabled' : ''}>
                                Votar por ${candidate.name.split(' ')[0]}
                            </button>
                        </div>
                    </div>
                </div>
            `;
             // --- FIN CAMBIO ---
            candidatesDisplay.insertAdjacentHTML('beforeend', cardHtml);
        });

        // Add event listeners - esto funciona igual, ya que busca todos los .btn-vote
        document.querySelectorAll('.btn-vote').forEach(button => {
            button.addEventListener('click', handleVoteClick);
        });
    }

    function startTimer() {
        // Asegurarse de no iniciar múltiples timers
        if (timerInterval !== null) {
           clearInterval(timerInterval);
        }
        timeLeft = 10 * 60; // Reiniciar tiempo
        timerDisplay.textContent = formatTime(timeLeft); // Mostrar tiempo inicial

        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = formatTime(timeLeft);

            if (timeLeft <= 0) {
                endVoting();
            }
        }, 1000);
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    function handleVoteClick(event) {
        // Prevenir que el click en el botón active otros eventos si está dentro de la tarjeta (aunque no debería ser problema aquí)
        event.stopPropagation();

        if (!votingActive) return;

        const candidateId = parseInt(event.target.dataset.candidateId);
        candidateToVerify = candidates.find(c => c.id === candidateId);

        if (candidateToVerify) {
            candidateToVoteSpan.textContent = candidateToVerify.name;
            verificationCodeInput.value = '';
            verificationError.textContent = '';
            verificationModal.style.display = 'flex';
            verificationCodeInput.focus();
        }
    }

    function closeModal() {
        verificationModal.style.display = 'none';
        candidateToVerify = null;
        verificationCodeInput.value = '';
        verificationError.textContent = '';
    }

    function processVoteVerification() {
         const enteredCode = verificationCodeInput.value;
         if (!candidateToVerify) return;

        if (enteredCode === correctVerificationCode) {
            recordVote(candidateToVerify);
            closeModal();
        } else {
            verificationError.textContent = 'Código incorrecto. Inténtalo de nuevo.';
            verificationCodeInput.focus();
            verificationCodeInput.select();
            verificationModal.querySelector('.modal-content').animate([
                 { transform: 'translateX(0)' }, { transform: 'translateX(-10px)' },
                 { transform: 'translateX(10px)' }, { transform: 'translateX(-5px)' },
                 { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }
            ], { duration: 300, easing: 'ease-in-out' });
        }
    }

    function recordVote(candidate) {
        if (!votingActive || votesCast >= maxVoters) {
            return;
        }

        candidate.votes++;
        votesCast++;
        votesCastDisplay.textContent = votesCast;

        console.log(`Voto registrado para ${candidate.name}. Total votos: ${candidate.votes}`);
        console.log(`Votos emitidos: ${votesCast}/${maxVoters}`);

        if (votesCast >= maxVoters) {
            endVoting();
        } else {
             // Opcional: Deshabilitar el botón específico que se acaba de usar si se quiere evitar doble click rápido antes de que el modal desaparezca
             // Aunque la lógica de maxVoters y votingActive debería ser suficiente
        }
    }

    // Phase 4: End Voting and Show Results
    function endVoting() {
        if (!votingActive && timerInterval === null) return; // Evitar ejecuciones múltiples

        console.log("¡Votación finalizada!");
        votingActive = false;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        timeLeft = 0; // Asegurarse que el tiempo es 0
        timerDisplay.textContent = "0:00";

        // Deshabilitar botones de voto
        document.querySelectorAll('.btn-vote').forEach(button => {
            button.disabled = true;
            button.textContent = "Votación Cerrada";
            button.style.backgroundColor = '#ccc';
            button.style.cursor = 'not-allowed';
        });

        calculateAndDisplayResults();
        switchSection(resultsSection);
    }

     function calculateAndDisplayResults() {
        // Find winner(s)
        let maxVotes = -1;
        let winners = [];
         // Asegurarse de que los votos sean números
         candidates.forEach(c => c.votes = Number(c.votes) || 0);

        candidates.forEach(candidate => {
            if (candidate.votes > maxVotes) {
                maxVotes = candidate.votes;
                winners = [candidate];
            } else if (candidate.votes === maxVotes && maxVotes >= 0) { // Considerar empates solo si hay votos
                winners.push(candidate);
            }
        });

        // Prepare results text
        let winnerText = '';
        // Handle cases with 0 votes cast or no candidates
        if (votesCast === 0 || candidates.length === 0) {
             winnerText = "No se registraron votos válidos o no hubo candidatos.";
             maxVotes = 0; // Ensure maxVotes is 0 for percentage calculation
        } else if (winners.length === 1) {
            const winner = winners[0];
            const percentage = maxVotes > 0 ? ((maxVotes / votesCast) * 100).toFixed(1) : 0;
            winnerText = `🎉 ¡El ganador es ${winner.name} con ${maxVotes} votos (${percentage}%)! 🎉`;
        } else if (winners.length > 1) {
             const names = winners.map(w => w.name).join(' y ');
             const percentage = maxVotes > 0 ? ((maxVotes / votesCast) * 100).toFixed(1) : 0;
             winnerText = `😮 ¡Hay un empate entre ${names}, cada uno con ${maxVotes} votos (${percentage}%)! 😮`;
        } else { // Fallback if maxVotes remained -1 (e.g., all candidates somehow got negative votes?)
             winnerText = "No se pudo determinar un ganador.";
             maxVotes = 0;
        }
        winnerAnnouncement.innerHTML = winnerText;


        // Prepare data for Chart.js
        const labels = candidates.map(c => c.name);
        const data = candidates.map(c => c.votes);
        const backgroundColors = generateVibrantColors(candidates.length);

         // Prepare detailed results list
         detailedResultsList.innerHTML = '';
         candidates.sort((a, b) => b.votes - a.votes);
         candidates.forEach(candidate => {
             const percentage = votesCast > 0 ? ((candidate.votes / votesCast) * 100).toFixed(1) : 0;
             const listItem = `
                 <li>
                     ${candidate.name}:
                     <span>${candidate.votes} votos</span>
                     <span class="percentage">(${percentage}%)</span>
                 </li>
             `;
             detailedResultsList.insertAdjacentHTML('beforeend', listItem);
         });


        // Create Pie Chart
        const ctx = resultsChartCanvas.getContext('2d');
        if (chartInstance) {
            chartInstance.destroy();
        }

        // Only draw chart if there are candidates and potentially votes
        if(candidates.length > 0) {
            chartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Votos',
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Distribución de Votos',
                            font: { size: 18, weight: 'bold' },
                            padding: { top: 10, bottom: 20 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) { label += ': '; }
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);
                                    const percentage = total > 0 ? (value / total * 100).toFixed(1) : 0;
                                    label += `${value} votos (${percentage}%)`;
                                    return label;
                                }
                            }
                        },
                        legend: {
                            position: 'bottom',
                            labels: { padding: 20 }
                        }
                    }
                }
            });
        } else {
            // Optional: Display a message if no chart can be drawn
            ctx.clearRect(0, 0, resultsChartCanvas.width, resultsChartCanvas.height); // Clear canvas
            ctx.textAlign = 'center';
            ctx.fillText("No hay datos para mostrar el gráfico.", resultsChartCanvas.width / 2, 50);
        }
    }

    // Helper function to switch active section
    function switchSection(sectionToShow) {
        document.querySelectorAll('section.active-section').forEach(sec => sec.classList.remove('active-section'));
        sectionToShow.classList.add('active-section');
    }

     // Helper to generate distinct vibrant colors
    function generateVibrantColors(count) {
        if (count === 0) return []; // Return empty if no candidates
        const colors = [];
        const baseHue = Math.random() * 360;
        const hueStep = count > 1 ? 360 / count : 0; // Avoid division by zero if count is 1
        for (let i = 0; i < count; i++) {
            const hue = (baseHue + i * hueStep) % 360;
            const saturation = 70 + Math.random() * 20;
            const lightness = 55 + Math.random() * 10;
            colors.push(`hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`);
        }
        // Shuffle for better visual separation
         for (let i = colors.length - 1; i > 0; i--) {
             const j = Math.floor(Math.random() * (i + 1));
            [colors[i], colors[j]] = [colors[j], colors[i]];
         }
        return colors;
     }

    // --- Initial State ---
    switchSection(configSection);

}); // End DOMContentLoaded