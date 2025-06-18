// Fixed metric values from your image
const fixedMetrics = {
  accuracy: (0.978 * 100).toFixed(1),    // ~97.8%
  precision: (0.90 * 100).toFixed(1),    // 90.0%
  recall: (0.69 * 100).toFixed(1),       // 69.0%
  f1: (0.73 * 100).toFixed(1),           // 73.0%
};

// Fetch model metrics every 5 seconds (simulated static)
function fetchModelMetrics() {
  const data = {
    ...fixedMetrics,
    updatedAt: new Date().toLocaleString(),
  };

  updateMetrics(data);
  updateCharts(data);
}

// Update textual values
function updateMetrics(data) {
  document.getElementById("accuracy").textContent = `${data.accuracy}%`;
  document.getElementById("precision").textContent = `${data.precision}%`;
  document.getElementById("recall").textContent = `${data.recall}%`;
  document.getElementById("f1").textContent = `${data.f1}%`;
  document.getElementById("last-updated").textContent = data.updatedAt;
}

// Reset canvas for smooth reload
function resetCanvas(id) {
  const container = document.getElementById(id).parentNode;
  container.innerHTML = `<canvas id="${id}"></canvas>`;
}

let lineChart, barChart, pieChart;

function updateCharts(data) {
  const labels = ["Accuracy", "Precision", "Recall", "F1 Score"];
  const values = [data.accuracy, data.precision, data.recall, data.f1];

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: "easeOutQuart",
    },
  };

  // Reset canvases for smooth animation
  resetCanvas("lineChart");
  resetCanvas("barChart");
  resetCanvas("pieChart");

  // Line Chart
  lineChart = new Chart(document.getElementById("lineChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Performance Over Time",
        data: values,
        borderColor: "#2563eb",
        fill: false,
        tension: 0.3,
      }],
    },
    options: chartOptions,
  });

  // Bar Chart
  barChart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "% Score",
        data: values,
        backgroundColor: "#10b981",
        barThickness: 40,
      }],
    },
    options: {
      ...chartOptions,
      scales: {
        x: {
          ticks: { color: "#333" },
        },
        y: {
          beginAtZero: true,
          min: 65,
          max: 100,
          ticks: {
            stepSize: 5,
            color: "#333",
          },
        },
      },
    },
  });

  // Pie Chart
  pieChart = new Chart(document.getElementById("pieChart"), {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ["#2563eb", "#10b981", "#f59e0b", "#ef4444"],
      }],
    },
    options: chartOptions,
  });
}

// Start the update loop
setInterval(fetchModelMetrics, 5000);
fetchModelMetrics();