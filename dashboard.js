// Project Status Chart
const ctx1 = document.getElementById('projectStatusChart').getContext('2d');

new Chart(ctx1, {
    type: 'doughnut',
    data: {
        labels: ['Planning', 'Design', 'Development', 'Testing', 'Live', 'On Hold'],
        datasets: [{
            data: [4, 6, 8, 3, 10, 2],
            backgroundColor: [
                '#a29bfe',
                '#6c5ce7',
                '#4b3fbf',
                '#b2bec3',
                '#00b894',
                '#fab1a0'
            ]
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom'
            }
        }
    }
});


// Revenue Chart
const ctx2 = document.getElementById('revenueChart').getContext('2d');

new Chart(ctx2, {
    type: 'line',
    data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Revenue (₹)',
            data: [300000, 350000, 420000, 390000, 450000, 480000],
            borderColor: '#6c5ce7',
            backgroundColor: 'rgba(108,92,231,0.1)',
            fill: true,
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                display: false
            }
        }
    }
});