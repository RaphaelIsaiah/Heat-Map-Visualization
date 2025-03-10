const url =
  "https://raw.githubusercontent.com/FreeCodeCamp/ProjectReferenceData/master/global-temperature.json";

// Colorbrewer scheme for the heat map
const colorbrewer = {
  RdYlBu: {
    11: [
      "#a50026",
      "#d73027",
      "#f46d43",
      "#fdae61",
      "#fee090",
      "#ffffbf",
      "#e0f3f8",
      "#abd9e9",
      "#74add1",
      "#4575b4",
      "#313695",
    ].reverse(), // Reverse the array to match the temperature range
  },
};

// Fetch data and create visualization
d3.json(url).then((data) => {
  data.monthlyVariance.forEach((d) => {
    d.month -= 1; // Convert month to 0-based index (January = 0, February = 1, etc.)
    d.temperature = data.baseTemperature + d.variance; // Calculate actual temperature
  });

  // Set up dimensions and padding
  const width = 1200; // Base width
  const height = 600; // Base height
  const padding = { top: 80, right: 40, bottom: 80, left: 80 }; // Padding around the chart

  // Create main SVG container
  const svg = d3
    .select("#container")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`) // Use viewBox for responsiveness
    .attr("preserveAspectRatio", "xMidYMid meet"); // Maintain aspect ratio

  // Create tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("id", "tooltip")
    .style("opacity", 0);

  // Create scales for x-axis (years) and y-axis (months)
  const xScale = d3
    .scaleBand()
    .domain(data.monthlyVariance.map((d) => d.year)) // Domain: array of years
    .range([padding.left, width - padding.right]) // Range: from left padding to right padding
    .padding(0); // No padding between bands

  const yScale = d3
    .scaleBand()
    .domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) // Domain: months (0-11)
    .range([padding.top, height - padding.bottom]) // Range: from top padding to bottom padding
    .padding(0); // No padding between bands

  // Create a color scale for the heat map
  const minTemp = d3.min(data.monthlyVariance, (d) => d.temperature); // Min temperature
  const maxTemp = d3.max(data.monthlyVariance, (d) => d.temperature); // Max temperature
  const colorScale = d3
    .scaleThreshold()
    .domain(d3.range(minTemp, maxTemp, (maxTemp - minTemp) / 11)) // Divide the range into 11 parts
    .range(colorbrewer.RdYlBu[11]); // Use the colorbrewer scheme

  // Create the x-axis (years)
  const xAxis = d3
    .axisBottom(xScale)
    .tickValues(xScale.domain().filter((year) => year % 20 === 0)) // Show ticks for years divisible by 20
    .tickFormat(d3.format("d")); // Format as integers

  // Create the y-axis (months)
  const yAxis = d3.axisLeft(yScale).tickFormat((month) => {
    const date = new Date(0);
    date.setUTCMonth(month); // Convert month number to a date
    return d3.timeFormat("%B")(date); // Format as month name (e.g., "January")
  });

  // Add the x-axis to the SVG
  svg
    .append("g")
    .attr("id", "x-axis")
    .attr("transform", `translate(0,${height - padding.bottom})`) // Position at the bottom
    .call(xAxis);

  // Add the y-axis to the SVG
  svg
    .append("g")
    .attr("id", "y-axis")
    .attr("transform", `translate(${padding.left},0)`) // Position at the left
    .call(yAxis);

  // Create heatmap cells
  svg
    .selectAll(".cell")
    .data(data.monthlyVariance) // Bind data to rectangles
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("data-month", (d) => d.month) // Store month
    .attr("data-year", (d) => d.year) // Store year
    .attr("data-temp", (d) => d.temperature) // Store temperature
    .attr("x", (d) => xScale(d.year)) // Position based on year
    .attr("y", (d) => yScale(d.month)) // Position based on month
    .attr("width", xScale.bandwidth()) // Width of each cell
    .attr("height", yScale.bandwidth()) // Height of each cell
    .attr("fill", (d) => colorScale(d.temperature)) // Color based on temperature
    .on("mouseover", (event, d) => {
      const tooltipWidth = tooltip.node().offsetWidth;
      const tooltipHeight = tooltip.node().offsetHeight;

      // Get the heat map boundaries
      const heatmapLeft = padding.left;
      const heatmapRight = width - padding.right;
      const heatmapTop = padding.top;
      const heatmapBottom = height - padding.bottom;

      // Calculate the cursor position relative to the SVG
      const [cursorX, cursorY] = d3.pointer(event);

      // Adjust tooltip position to stay within the heat map boundaries
      let left = cursorX + padding.left + 10; // Default tooltip position (left)
      let top = cursorY + padding.top - 40; // Default tooltip position (top)

      // Prevent tooltip from overflowing the right edge
      if (left + tooltipWidth > heatmapRight) {
        left = cursorX + padding.left - tooltipWidth - 20; // Move tooltip to the left of the cursor
      }

      // Prevent tooltip from overflowing the left edge
      if (left < heatmapLeft) {
        left = heatmapLeft + 10; // Move tooltip to the right edge of the heat map
      }

      // Prevent tooltip from overflowing the bottom edge
      if (top + tooltipHeight > heatmapBottom) {
        top = cursorY + padding.top - tooltipHeight - 10; // Move tooltip above the cursor
      }

      // Prevent tooltip from overflowing the top edge
      if (top < heatmapTop) {
        top = heatmapTop + 10; // Move tooltip to the bottom edge of the heat map
      }

      const date = new Date(d.year, d.month); // Create a date object
      tooltip
        .html(
          `
                ${d3.timeFormat("%Y - %B")(date)}<br>
                Temperature: ${d.temperature.toFixed(2)}°C<br>
                Variance: ${d.variance.toFixed(2)}°C
            `
        )
        .attr("data-year", d.year)
        .style("opacity", 1) // Make tooltip visible
        .style("left", `${left}px`)
        .style("top", `${top}px`);
    })
    .on("mouseout", () => {
      // Hide tooltip
      tooltip.style("opacity", 0);
    });

  // Create legend
  const legendWidth = 400;
  const legendHeight = 30;
  const legend = svg
    .append("g")
    .attr("id", "legend")
    .attr("transform", `translate(${padding.left},${height - 50})`);

  // Create a linear scale for the legend
  const legendScale = d3
    .scaleLinear()
    .domain([minTemp, maxTemp]) // Domain: temperature range
    .range([0, legendWidth]); // Range: width of the legend

  // Create an axis for the legend
  const legendAxis = d3
    .axisBottom(legendScale)
    .ticks(6) // Number of ticks
    .tickFormat(d3.format(".1f")); // Format as floating-point numbers

  // Add colored rectangles to the legend
  legend
    .append("g")
    .selectAll("rect")
    .data(colorScale.range()) // Bind color scale range to rectangles
    .enter()
    .append("rect")
    .attr("x", (d, i) => legendScale(colorScale.domain()[i])) // Position based on temperature
    .attr("y", 0)
    .attr(
      "width",
      (d, i) =>
        i === colorScale.domain().length - 1
          ? legendWidth - legendScale(colorScale.domain()[i]) // Last rectangle
          : legendScale(colorScale.domain()[i + 1]) -
            legendScale(colorScale.domain()[i]) // Other rectangles
    )
    .attr("height", legendHeight)
    .attr("fill", (d) => d);

  // Add the legend axis
  legend
    .append("g")
    .attr("transform", `translate(0,${legendHeight})`) // Position below the rectangles
    .call(legendAxis);

  // Add a title to the chart
  svg
    .append("text")
    .attr("id", "title")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .text("Monthly Global Land-Surface Temperature");

  // Add a description to the chart
  svg
    .append("text")
    .attr("id", "description")
    .attr("x", width / 2)
    .attr("y", 70)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text(
      `${data.monthlyVariance[0].year} - ${
        data.monthlyVariance[data.monthlyVariance.length - 1].year
      } (Base Temperature: ${data.baseTemperature}°C)`
    );

  // Redraw chart on window resize
  window.addEventListener("resize", () => {
    const containerWidth = d3
      .select("#container")
      .node()
      .getBoundingClientRect().width;
    svg.attr("width", containerWidth); // Adjust SVG width to container width
  });
});
