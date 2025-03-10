const url =
  "https://raw.githubusercontent.com/FreeCodeCamp/ProjectReferenceData/master/global-temperature.json";

// Colorbrewer scheme
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
    ].reverse(),
  },
};

// Fetch data and create visualization
d3.json(url).then((data) => {
  data.monthlyVariance.forEach((d) => {
    d.month -= 1; // Convert month to 0-based index
    d.temperature = data.baseTemperature + d.variance;
  });

  // Set up dimensions
  const width = 1200;
  const height = 600;
  const padding = { top: 80, right: 40, bottom: 80, left: 80 };

  // Create main SVG
  const svg = d3
    .select("#container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Create tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("id", "tooltip")
    .style("opacity", 0);

  // Create scales
  const xScale = d3
    .scaleBand()
    .domain(data.monthlyVariance.map((d) => d.year))
    .range([padding.left, width - padding.right])
    .padding(0);

  const yScale = d3
    .scaleBand()
    .domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) // Months (0-11)
    .range([padding.top, height - padding.bottom])
    .padding(0);

  // Color scale
  const minTemp = d3.min(data.monthlyVariance, (d) => d.temperature);
  const maxTemp = d3.max(data.monthlyVariance, (d) => d.temperature);
  const colorScale = d3
    .scaleThreshold()
    .domain(d3.range(minTemp, maxTemp, (maxTemp - minTemp) / 11))
    .range(colorbrewer.RdYlBu[11]);

  // Create axes
  const xAxis = d3
    .axisBottom(xScale)
    .tickValues(xScale.domain().filter((year) => year % 10 === 0)) // Show ticks for years divisible by 10
    .tickFormat(d3.format("d"));

  const yAxis = d3.axisLeft(yScale).tickFormat((month) => {
    const date = new Date(0);
    date.setUTCMonth(month);
    return d3.timeFormat("%B")(date); // Format as month name
  });

  // Add axes
  svg
    .append("g")
    .attr("id", "x-axis")
    .attr("transform", `translate(0,${height - padding.bottom})`)
    .call(xAxis);

  svg
    .append("g")
    .attr("id", "y-axis")
    .attr("transform", `translate(${padding.left},0)`)
    .call(yAxis);

  // Create heatmap cells
  svg
    .selectAll(".cell")
    .data(data.monthlyVariance)
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("data-month", (d) => d.month)
    .attr("data-year", (d) => d.year)
    .attr("data-temp", (d) => d.temperature)
    .attr("x", (d) => xScale(d.year))
    .attr("y", (d) => yScale(d.month))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("fill", (d) => colorScale(d.temperature))
    .on("mouseover", (event, d) => {
      const tooltipWidth = tooltip.node().offsetWidth;
      const tooltipHeight = tooltip.node().offsetHeight;

      let left = event.pageX + 10;
      let top = event.pageY - 40;

      // Prevent tooltip overflow
      if (left + tooltipWidth > window.innerWidth) {
        left = event.pageX - tooltipWidth - 10;
      }
      if (top < 0) {
        top = event.pageY + 10;
      }
      const date = new Date(d.year, d.month);
      tooltip
        .html(
          `
                ${d3.timeFormat("%Y - %B")(date)}<br>
                Temperature: ${d.temperature.toFixed(2)}°C<br>
                Variance: ${d.variance.toFixed(2)}°C
            `
        )
        .attr("data-year", d.year)
        .style("opacity", 1)
        .style("left", `${left}px`)
        .style("top", `${top}px`);
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  // Create legend
  const legendWidth = 400;
  const legendHeight = 30;
  const legend = svg
    .append("g")
    .attr("id", "legend")
    .attr("transform", `translate(${padding.left},${height - 50})`);

  const legendScale = d3
    .scaleLinear()
    .domain([minTemp, maxTemp])
    .range([0, legendWidth]);

  const legendAxis = d3
    .axisBottom(legendScale)
    .ticks(10)
    .tickFormat(d3.format(".1f"));

  legend
    .append("g")
    .selectAll("rect")
    .data(colorScale.range())
    .enter()
    .append("rect")
    .attr("x", (d, i) => legendScale(colorScale.domain()[i]))
    .attr("y", 0)
    .attr("width", (d, i) =>
      i === colorScale.domain().length - 1
        ? legendWidth - legendScale(colorScale.domain()[i])
        : legendScale(colorScale.domain()[i + 1]) -
          legendScale(colorScale.domain()[i])
    )
    .attr("height", legendHeight)
    .attr("fill", (d) => d);

  legend
    .append("g")
    .attr("transform", `translate(0,${legendHeight})`)
    .call(legendAxis);

  // Add titles
  svg
    .append("text")
    .attr("id", "title")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .text("Monthly Global Land-Surface Temperature");

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
});
