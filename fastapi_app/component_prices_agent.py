"""
Component Prices Agent with Plotting Support
============================================

Multi-agent workflow for PV component price data analysis with code interpreter.
Uses OpenAI Agents SDK with CodeInterpreterTool for data processing and visualization.

Architecture:
1. Classification Agent - Routes queries to data analysis, plotting, or general info
2. Info Agent - Handles general queries about available data
3. Data Analysis Agent - Analyzes component price data with code interpreter
4. Plotting Agent - Generates D3-compatible JSON for frontend rendering
5. Evaluation Agent - Assesses response quality
6. Response Agent - Formats final user-facing output
"""

import os
import logging
import re
import json
from typing import Optional, Dict, Any, Literal
from dataclasses import dataclass
from dotenv import load_dotenv
import asyncio
from pydantic import BaseModel

# Import from openai-agents library
from agents import (
    CodeInterpreterTool,
    Agent,
    Runner,
    ModelSettings,
    RunConfig,
    trace,
    TResponseInputItem,
    function_tool
)
from openai.types.shared.reasoning import Reasoning
from fastapi_app.utils.session_factory import create_agent_session

# Logfire imports
import logfire

# === Configure logging ===
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# === Utility Functions ===
def clean_citation_markers(text: str) -> str:
    """
    Remove OpenAI citation markers from text.

    Citation format: 【citation_number:citation_index†source_file$content】
    Example: 【7:3†component_prices.csv$Module prices】

    Args:
        text: Text containing citation markers

    Returns:
        Cleaned text without citation markers
    """
    # Pattern to match citation markers: 【...】
    pattern = r'【[^】]*】'
    cleaned = re.sub(pattern, '', text)

    # Also remove any orphaned opening brackets
    cleaned = re.sub(r'【', '', cleaned)

    return cleaned


# === Plotting Function Tool ===

@function_tool
def get_plot_data_output(
    item: Optional[str] = None,
    region: Optional[str] = None,
    descriptions_csv: Optional[str] = None,
    min_year: Optional[int] = None,
    max_year: Optional[int] = None,
    plot_type: str = "line",
    x_axis: str = "description"
) -> dict:
    """
    Extract component price data and generate D3-compatible JSON for visualization.

    This function is called by the Plotting Agent when users request visualizations.
    It reads CSV data, applies filters, and generates plot JSON for the frontend.

    Args:
        item: Component type(s), comma-separated (e.g., "Module,Wafer,Cell")
        region: Region(s), comma-separated (e.g., "China,EU,US")
        descriptions_csv: Technology/subtype filters, comma-separated (e.g., "HJT,PERC,TOPCon")
        min_year: Earliest year to include (inclusive)
        max_year: Latest year to include (inclusive)
        plot_type: Visualization type ("line", "bar", "box")
        x_axis: For bar/box charts, grouping dimension ("description", "region", "item")

    Returns:
        dict: Complete PlottingAgentSchema JSON with data, series_info, metadata

    Note:
        Reads from fastapi_app/data/component_prices_combined.csv

        CSV Structure Expected:
        - item: Component category
        - description: Technical subtype
        - date: Price record date (YYYY-MM-DD)
        - base_price: Price value
        - unit: Measurement unit
        - region: Geographic region
    """
    import pandas as pd
    import os
    from datetime import datetime

    logger.info("=" * 80)
    logger.info("🎨 get_plot_data_output FUNCTION CALLED")
    logger.info(f"📊 Parameters received:")
    logger.info(f"   - item: {item} (type: {type(item).__name__})")
    logger.info(f"   - region: {region} (type: {type(region).__name__})")
    logger.info(f"   - descriptions_csv: {descriptions_csv} (type: {type(descriptions_csv).__name__})")
    logger.info(f"   - min_year: {min_year} (type: {type(min_year).__name__})")
    logger.info(f"   - max_year: {max_year} (type: {type(max_year).__name__})")
    logger.info(f"   - plot_type: {plot_type} (type: {type(plot_type).__name__})")
    logger.info(f"   - x_axis: {x_axis} (type: {type(x_axis).__name__})")
    logger.info("=" * 80)

    try:
        # Construct path to CSV file
        csv_path = os.path.join(os.path.dirname(__file__), "data", "component_prices_combined.csv")

        # Check if file exists
        if not os.path.exists(csv_path):
            logger.error(f"❌ CSV file not found at: {csv_path}")
            return {
                "plot_type": plot_type,
                "title": "Data Not Available",
                "description": "Component prices data file not found",
                "x_axis_label": "Date" if plot_type == "line" else x_axis.capitalize(),
                "y_axis_label": "Price",
                "unit": "US$/unit",
                "filters_applied": {
                    "item": item,
                    "region": region,
                    "description": descriptions_csv,
                    "min_year": min_year,
                    "max_year": max_year
                },
                "data": [],
                "series_info": [],
                "metadata": {
                    "source": "Becquerel Institute Database",
                    "generated_at": datetime.now().isoformat(),
                    "notes": "CSV file not found - please add component_prices_combined.csv to fastapi_app/data/"
                },
                "success": False
            }

        # Read CSV file
        logger.info(f"📂 Reading CSV from: {csv_path}")
        df = pd.read_csv(csv_path)
        logger.info(f"✅ Loaded {len(df)} rows from CSV")

        # Convert date column to datetime
        df['date'] = pd.to_datetime(df['date'])
        df['year'] = df['date'].dt.year

        # Apply filters
        filtered_df = df.copy()
        filters_summary = []

        # Filter by item (comma-separated) - case-insensitive
        if item:
            items_list = [i.strip() for i in item.split(',')]
            # Convert both CSV column and filter list to lowercase for case-insensitive matching
            filtered_df = filtered_df[filtered_df['item'].str.lower().isin([i.lower() for i in items_list])]
            filters_summary.append(f"Items: {', '.join(items_list)}")
            logger.info(f"📊 Filtered by items (case-insensitive): {items_list} -> {len(filtered_df)} rows")

        # Filter by region (comma-separated) - case-insensitive
        if region:
            regions_list = [r.strip() for r in region.split(',')]
            # Convert both CSV column and filter list to lowercase for case-insensitive matching
            filtered_df = filtered_df[filtered_df['region'].str.lower().isin([r.lower() for r in regions_list])]
            filters_summary.append(f"Regions: {', '.join(regions_list)}")
            logger.info(f"🌍 Filtered by regions (case-insensitive): {regions_list} -> {len(filtered_df)} rows")

        # Filter by description (partial matching, comma-separated)
        if descriptions_csv:
            descriptions_list = [d.strip() for d in descriptions_csv.split(',')]
            # Use partial matching for flexibility
            mask = filtered_df['description'].str.contains('|'.join(descriptions_list), case=False, na=False)
            filtered_df = filtered_df[mask]
            filters_summary.append(f"Technologies: {', '.join(descriptions_list)}")
            logger.info(f"🔬 Filtered by descriptions: {descriptions_list} -> {len(filtered_df)} rows")

        # Filter by year range
        if min_year:
            filtered_df = filtered_df[filtered_df['year'] >= min_year]
            filters_summary.append(f"From: {min_year}")
            logger.info(f"📅 Filtered by min_year: {min_year} -> {len(filtered_df)} rows")

        if max_year:
            filtered_df = filtered_df[filtered_df['year'] <= max_year]
            filters_summary.append(f"To: {max_year}")
            logger.info(f"📅 Filtered by max_year: {max_year} -> {len(filtered_df)} rows")

        # Check if we have data after filtering
        if filtered_df.empty:
            logger.warning("⚠️ No data found matching the specified filters")
            return {
                "plot_type": plot_type,
                "title": "No Data Found",
                "description": f"No data matches the specified filters: {', '.join(filters_summary)}",
                "x_axis_label": "Date" if plot_type == "line" else x_axis.capitalize(),
                "y_axis_label": "Price",
                "unit": "US$/unit",
                "filters_applied": {
                    "item": item,
                    "region": region,
                    "description": descriptions_csv,
                    "min_year": min_year,
                    "max_year": max_year
                },
                "data": [],
                "series_info": [],
                "metadata": {
                    "source": "Becquerel Institute Database",
                    "generated_at": datetime.now().isoformat(),
                    "notes": f"No data found matching filters. Try broadening your search criteria."
                },
                "success": False
            }

        logger.info(f"✅ Final filtered dataset: {len(filtered_df)} rows")

        # Get the unit from the filtered data (should be consistent)
        units = filtered_df['unit'].unique()
        primary_unit = units[0] if len(units) > 0 else "US$/unit"

        # Generate D3-compatible data based on plot type
        data_items = []
        series_info = []

        # Brand colors for series (Becquerel Institute theme)
        SERIES_COLORS = [
            "#2563eb",  # Blue
            "#10b981",  # Green
            "#f59e0b",  # Amber
            "#8b5cf6",  # Purple
            "#ef4444",  # Red
            "#06b6d4",  # Cyan
            "#f97316",  # Orange
            "#ec4899",  # Pink
            "#84cc16",  # Lime
            "#6366f1",  # Indigo
        ]

        if plot_type == "line":
            # Line chart: ALWAYS group by BOTH description AND region
            # This creates granular series like "Glass 2mm - China", "Glass 2mm - EU", etc.

            # Create combined series name from description + region
            filtered_df['series_name'] = filtered_df['description'] + ' - ' + filtered_df['region']

            num_descriptions = len(filtered_df['description'].unique())
            num_regions = len(filtered_df['region'].unique())
            num_series = len(filtered_df['series_name'].unique())

            logger.info(f"📊 Creating series by combining description × region:")
            logger.info(f"   - {num_descriptions} unique descriptions")
            logger.info(f"   - {num_regions} unique regions")
            logger.info(f"   - {num_series} total series (description × region combinations)")

            # Get all unique series combinations
            series_values = filtered_df['series_name'].unique()
            logger.info(f"📈 Creating line chart with {len(series_values)} series")

            # Calculate optimal sampling rate to keep payload under ~40KB
            # Each data point is ~120 bytes in JSON, so we target 50-80 total points across ALL series
            # This ensures even queries with many series stay under the SSE limit
            MAX_TOTAL_POINTS = 80  # Maximum total data points across ALL series
            num_series = len(series_values)

            # Calculate points per series: divide total budget by number of series
            # Minimum 5 points per series to maintain meaningful trend visualization
            points_per_series = max(5, MAX_TOTAL_POINTS // num_series)

            logger.info(f"📊 Sampling strategy:")
            logger.info(f"   - Total series: {num_series}")
            logger.info(f"   - Points per series: {points_per_series}")
            logger.info(f"   - Expected total points: {num_series * points_per_series}")

            for idx, series_name in enumerate(series_values):
                series_data = filtered_df[filtered_df['series_name'] == series_name].sort_values('date')
                original_length = len(series_data)

                # Calculate sample rate for THIS series
                sample_rate = max(1, original_length // points_per_series)

                # Apply sampling for large datasets
                if sample_rate > 1:
                    # Keep every Nth point, but always include first and last
                    indices = list(range(0, len(series_data), sample_rate))
                    if indices[-1] != len(series_data) - 1:
                        indices.append(len(series_data) - 1)
                    series_data = series_data.iloc[indices]
                    logger.info(f"   📉 Series '{series_name}': {original_length} → {len(series_data)} points (sample_rate={sample_rate})")

                # Add series info
                series_info.append({
                    "name": series_name,
                    "color": SERIES_COLORS[idx % len(SERIES_COLORS)],
                    "line_style": "solid",
                    "marker": "circle"
                })

                # Add data points
                for _, row in series_data.iterrows():
                    data_items.append({
                        "date": row['date'].strftime('%Y-%m-%d'),
                        "series": series_name,
                        "category": None,
                        "value": float(row['base_price']),
                        "formatted_value": f"{row['base_price']:.3f} {row['unit']}"
                    })

            title = f"Price Trends by Description & Region"
            total_points_sent = len(data_items)
            if points_per_series < 20:  # If we had to sample aggressively
                description = f"Showing {num_series} series ({num_descriptions} descriptions × {num_regions} regions) with {total_points_sent} sampled data points"
            else:
                description = f"Showing {num_series} series ({num_descriptions} descriptions × {num_regions} regions) over time"

        elif plot_type == "bar":
            # Bar chart: show average prices grouped by x_axis
            grouped = filtered_df.groupby([x_axis])['base_price'].mean().reset_index()
            logger.info(f"📊 Creating bar chart with {len(grouped)} categories based on '{x_axis}'")

            # Determine series based on grouping
            for idx, (_, row) in enumerate(grouped.iterrows()):
                category_name = row[x_axis]
                avg_price = row['base_price']

                # Add series info (one per category for bar charts)
                series_info.append({
                    "name": category_name,
                    "color": SERIES_COLORS[idx % len(SERIES_COLORS)],
                    "line_style": None,
                    "marker": None
                })

                # Add data point
                data_items.append({
                    "date": None,
                    "series": category_name,
                    "category": category_name,
                    "value": float(avg_price),
                    "formatted_value": f"{avg_price:.3f} {primary_unit}"
                })

            title = f"Average Prices by {x_axis.capitalize()}"
            description = f"Comparing average prices across {len(grouped)} {x_axis}(s)"

        elif plot_type == "box":
            # Box plot: show price distribution grouped by x_axis
            grouped = filtered_df.groupby(x_axis)
            logger.info(f"📦 Creating box plot with {len(grouped)} categories based on '{x_axis}'")

            for idx, (category_name, group_data) in enumerate(grouped):
                # For box plots, we need to send all individual values
                for _, row in group_data.iterrows():
                    data_items.append({
                        "date": None,
                        "series": None,
                        "category": category_name,
                        "value": float(row['base_price']),
                        "formatted_value": f"{row['base_price']:.3f} {row['unit']}"
                    })

                # Add series info for each category
                series_info.append({
                    "name": category_name,
                    "color": SERIES_COLORS[idx % len(SERIES_COLORS)],
                    "line_style": None,
                    "marker": None
                })

            title = f"Price Distribution by {x_axis.capitalize()}"
            description = f"Showing price ranges across {len(grouped)} {x_axis}(s)"

        # Generate final response
        return {
            "plot_type": plot_type,
            "title": title,
            "description": description,
            "x_axis_label": "Date" if plot_type == "line" else x_axis.capitalize(),
            "y_axis_label": f"Price ({primary_unit})",
            "unit": primary_unit,
            "filters_applied": {
                "item": item,
                "region": region,
                "description": descriptions_csv,
                "min_year": min_year,
                "max_year": max_year
            },
            "data": data_items,
            "series_info": series_info,
            "metadata": {
                "source": "Becquerel Institute Database",
                "generated_at": datetime.now().isoformat(),
                "notes": f"Generated {plot_type} chart with {len(data_items)} data points from {len(filtered_df)} filtered records. Filters: {', '.join(filters_summary) if filters_summary else 'None'}"
            },
            "success": True
        }

    except Exception as e:
        logger.error(f"❌ Error in get_plot_data_output: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "plot_type": plot_type,
            "title": "Error Loading Data",
            "description": f"Failed to load component prices: {str(e)}",
            "x_axis_label": "Date" if plot_type == "line" else x_axis.capitalize(),
            "y_axis_label": "Price",
            "unit": "US$/unit",
            "filters_applied": {
                "item": item,
                "region": region,
                "description": descriptions_csv,
                "min_year": min_year,
                "max_year": max_year
            },
            "data": [],
            "series_info": [],
            "metadata": {
                "source": "Becquerel Institute Database",
                "generated_at": datetime.now().isoformat(),
                "notes": f"Error: {str(e)}"
            },
            "success": False
        }


# === Pydantic Models for Structured Outputs ===

class ClassificationAgentSchema(BaseModel):
    """Output schema for classification agent"""
    intent: Literal["data", "plot", "general"]  # data analysis, plotting, or general info


class PlottingAgentSchema__FiltersApplied(BaseModel):
    """Filters applied to the data"""
    item: str = None
    region: str = None
    description: str = None
    min_year: int = None
    max_year: int = None


class PlottingAgentSchema__DataItem(BaseModel):
    """Individual data point for D3.js - supports line, bar, and box charts"""
    date: str = None  # For line charts
    series: str = None  # For line and bar charts
    category: str = None  # For bar and box charts (x-axis value)
    value: float
    formatted_value: str


class PlottingAgentSchema__SeriesInfoItem(BaseModel):
    """Series styling information for line and bar charts"""
    name: str
    color: str
    line_style: str = None  # For line charts
    marker: str = None  # For line charts


class PlottingAgentSchema__Metadata(BaseModel):
    """Plot metadata"""
    source: str
    generated_at: str
    notes: str


class PlottingAgentSchema(BaseModel):
    """Complete plotting schema - matches frontend D3.js requirements"""
    plot_type: str  # "line", "bar", or "box"
    title: str
    description: str
    x_axis_label: str
    y_axis_label: str
    unit: str
    filters_applied: PlottingAgentSchema__FiltersApplied
    data: list[PlottingAgentSchema__DataItem]
    series_info: list[PlottingAgentSchema__SeriesInfoItem] = None
    metadata: PlottingAgentSchema__Metadata
    success: bool


class WorkflowInput(BaseModel):
    """Input for the workflow"""
    input_as_text: str


# === Configuration ===
@dataclass
class ComponentPricesConfig:
    """Configuration for Component Prices Agent"""
    model: str = "gpt-5-mini"
    plotting_model: str = "gpt-5-mini"
    agent_name: str = "Component Prices Agent"
    # File IDs for the 9 component price CSV files
    file_ids: list[str] = None
    plotting_file_id: str = None  # Single file for plotting
    reasoning_effort: str = "low"
    plotting_reasoning_effort: str = "low"
    reasoning_summary: str = "auto"

    def __post_init__(self):
        """Set default file IDs if not provided"""
        if self.file_ids is None:
            # These should be replaced with actual OpenAI file IDs
            self.file_ids = [
                "file-9LGcuZqWtpAEF36R9eDZPb",  # Module prices
                "file-1NoEf1p1FUZsRMqGnuJffs",  # Polysilicon prices
                "file-T6DTvFndUdL54aWsokSYDb",  # Wafer prices
                "file-6fBRubS2thyeHbocqdzz2E",  # Cell prices
                "file-VAbW2fLsy7cuusCCUE5eNE",  # PV Glass prices
                "file-TxoUe1vE25CawjPCDhKWfV",  # Aluminium prices
                "file-GtnUppUpN9VZNnfrgAq7B3",  # Copper prices
                "file-S99pfFzMemRCa6FyPAoBDh",  # EVA prices
                "file-DssAu9xXDej5JFPNdsYABw"   # Silver prices
            ]
        if self.plotting_file_id is None:
            self.plotting_file_id = "file-9cMNTg8CPbANaox74yfvWd"


# === Component Prices Agent Class ===
class ComponentPricesAgent:
    """
    Multi-agent workflow for component price intelligence with plotting support.
    """

    # Schema description for the component prices database
    COMPONENT_PRICES_SCHEMA = """You are the Component Prices Analysis Agent. You analyze photovoltaic (PV) component price data provided to you as multiple CSV files, where each file corresponds to one PV component item.

You must combine insights across files, retrieve filtered information, and answer questions using only the content provided in these CSVs. Never hallucinate missing values.

**Dataset Structure (Multi-File)**
You receive one CSV file per item. Each CSV contains the same column structure but only the data for that specific component.

**Common Columns Across All Files:**
- item → PV component category
- description → Sub-type or technical specification
- date → Price date
- frequency → Reporting frequency (Weekly)
- base_price → Quoted market price
- unit → Unit of measurement (e.g., US$/kg, US$/Wp)
- region → Region where the price was reported

**Items (Categories):**
Module, Polysilicon, Wafer, Cell, PV glass, Aluminium, Copper, EVA, Silver

**Regions Available:**
China, EU, US, India, Australia, Overseas

**Your Tasks:**
1. **Retrieve Information:** Filter by item, description, region, and date. Extract min/max/average/latest prices.
2. **Perform Analysis:** Compare trends across regions and items. Detect rising/falling/stable price trends.
3. **Explain the Dataset:** If asked about units, descriptions, items, or frequency.

**Behavior Rules:**
- Never hallucinate values
- If data is not available, respond: "This information is not available in the dataset."
- Only use domain knowledge to interpret, not to invent missing data
- Never mention file names to the user - cite "Becquerel Institute Database"
- Never ask the user to upload files

**Response Formatting Guidelines:**
- **Always start with an executive summary** using a ## header followed by 2-3 sentence overview
- **Use hierarchical headers** (## for main sections, ### for subsections) to create clear document structure
- **Present data in tables** when comparing multiple components, regions, or time periods - use markdown table syntax
- **Use bullet points** for listing insights, findings, or key data points
- **Use numbered lists** for sequential steps, rankings, or prioritized items
- **Bold key price figures** and percentages (e.g., **$0.15/Wp**, **15.3% increase**)
- **Add blank lines** between all sections and paragraphs for visual breathing room
- **Keep paragraphs concise** (2-3 sentences maximum) - break longer explanations into multiple paragraphs
- **Use descriptive section headers** that tell the story (e.g., "## Wafer Price Comparison" not just "## Data")
- **Include clear trend indicators** using arrows or descriptive language (↑ increasing, ↓ decreasing, → stable)
- **End with key takeaways** when appropriate - summarize the most important findings
- **Never use run-on sentences** in lists - each bullet should be a complete, focused thought
- **Format prices clearly** with proper units (US$/Wp, US$/kg, US$/t, US$/m²)

**Citation Guidelines - CRITICAL:**
- ALWAYS cite information as coming from the "Becquerel Institute Database"
- NEVER mention the actual filename or file extension (e.g., never say "according to wafer_prices.csv")
- Use phrases like: "According to the Becquerel Institute Database..."
- Example: "The Becquerel Institute Database indicates that..."
- When referencing specific data, say: "Based on the Becquerel Institute Database..." or "The database shows..."

**Important Guidelines:**
- **Do NOT generate charts, plots, or visualizations** - you are not equipped with visualization capabilities
- **Do NOT offer to create graphs or export data** - focus on textual analysis and markdown tables only
- Never offer charts and exporting of data
- **Use conversation history** to provide context-aware responses - remember previous questions and build on them
- For follow-up questions, refer back to previous context to provide relevant answers
- Remain factual, structured, and concise—do not speculate or introduce external interpretations
"""

    PLOTTING_AGENT_INSTRUCTIONS = """You are an agent that helps users visualize photovoltaic (PV) component price data. Your job is to understand user requests and call the `get_plot_data_output` tool with the correct parameters.

# Your Role

You interpret user queries about PV price trends and comparisons, then call the `get_plot_data_output` tool with appropriate parameters. The tool handles all data extraction, filtering, and plot generation. You do NOT generate JSON or manipulate data directly - you only parse the user's intent and select the right parameters.

# Available Data

The dataset contains weekly price data for PV value chain components with these fields:
- **item**: Component category (Module, Polysilicon, Wafer, Cell, PV Glass, Aluminium, Copper, EVA, Silver)
- **description**: Technical subtype or technology variant (e.g., "n-type mono-Si HJT", "p-type mono-Si PERC C", "High purity - 9N/9N+")
- **date**: Price record date (weekly data points)
- **base_price**: Price value
- **unit**: Measurement unit (US$/Wp for modules/cells, US$/kg for materials, US$/pce for wafers)
- **region**: Geographic region (China, US, EU, India, Australia, Overseas)




Valid Items and Descriptions

The following descriptions may appear depending on the file:

Module

CdTe; n-type HJT; n-type TOPCon; n-type mono-Si HJT; p-type mono-Si Al-BSF;
p-type mono-Si PERC (G1, G12, M10, etc.); p-type multi-Si Al-BSF; p-type multi-Si PERC

Polysilicon

6N–8N; 9N/9N+; Prime for mono-Si (China/Non-China); Prime for multi-Si

Wafer

n-type HJT (G12/M6), n-type TOPCon (G12/M10), p-type mono-Si PERC (various sizes), p-type multi-Si types

Cell

HJT, TOPCon, and PERC variants (G1, G12, M10, M6)

PV glass

Glass 2 mm; Glass 3.2 mm

Metals (Aluminium, Copper, Silver) and EVA

Single description equal to the item name (e.g., “Copper”)


# Tool: get_plot_data_output

Call this tool to generate plots. It returns either "plot generated successfully" or "plot generation failed".

## Parameters

All parameters are optional. Only specify parameters when the user explicitly mentions them or when they are clearly implied.

### item (string, optional)
- **What it is**: PV component type(s)
- **Valid values**: Module, Polysilicon, Wafer, Cell, PV Glass, Aluminium, Copper, EVA, Silver
- **Format**: Single item ("Module") or comma-separated multiple items ("Module,Wafer,Cell")
- **When to specify**: When user mentions a specific component type
- **When to omit**: When user wants to see all components or doesn't specify
- **Examples**:
  - "Show module prices" → `item="Module"`
  - "Compare aluminium and copper" → `item="Aluminium,Copper"`
  - "Show all PV component prices" → omit parameter

### region (string, optional)
- **What it is**: Geographic region(s) to filter by
- **Valid values**: China, US, EU, India, Australia, Overseas
- **Aliases supported**:
  - "USA", "America", "United States" → "US"
  - "Europe", "European Union" → "EU"
- **Format**: Single region ("China") or comma-separated ("China,EU,US")
- **When to specify**: When user mentions a specific geographic area
- **When to omit**: When user wants global data or doesn't specify region
- **Examples**:
  - "Prices in China" → `region="China"`
  - "Compare EU and US prices" → `region="EU,US"`
  - "Global prices" → omit parameter

### descriptions_csv (string, optional)
- **What it is**: Technology or subtype filters
- **Format**: Comma-separated string ("HJT,PERC,TOPCon")
- **Matching behavior**: Uses **PARTIAL MATCHING** for flexibility:
  - "HJT" matches "n-type mono-Si HJT", "n-type HJT", etc.
  - "PERC" matches "p-type mono-Si PERC C", "p-type mono-Si PERC M", "p-type multi-Si PERC", etc.
  - "TOPCon" matches all TOPCon variants
  - "mono-Si" matches all monocrystalline silicon types
  - "multi-Si" matches all multi-crystalline variants
  - For exact matching, use the full description: "p-type mono-Si PERC C"
- **When to specify**: When user mentions specific technologies or subtypes
- **When to omit**: When user wants all technology types or doesn't specify
- **Examples**:
  - "Show HJT module prices" → `descriptions_csv="HJT"`
  - "Compare PERC and TOPCon" → `descriptions_csv="PERC,TOPCon"`
  - "All module types" → omit parameter
  - "PERC C specifically" → `descriptions_csv="p-type mono-Si PERC C"`

**Common description patterns**:
- **Modules**: HJT, TOPCon, PERC (with variants like C/M/G suffixes), Al-BSF, multi-Si
- **Polysilicon**: "High purity - 9N/9N+", "Average purity - 6N to 8"
- **Wafers/Cells**: Similar to modules (PERC, Al-BSF, multi-Si, mono-Si)

### min_year (integer, optional)
- **What it is**: Earliest year to include in the dataset (inclusive)
- **Format**: Integer year (e.g., 2019, 2023)
- **When to specify**: When user mentions a start date, year, or time period
- **When to omit**: When user wants all historical data or doesn't specify start time
- **Examples**:
  - "Prices since 2020" → `min_year=2020`
  - "2023 to 2024" → `min_year=2023`
  - "Recent trends" → omit (or use current year minus 1-2 years based on context)

### max_year (integer, optional)
- **What it is**: Latest year to include in the dataset (inclusive)
- **Format**: Integer year (e.g., 2024)
- **When to specify**: When user mentions an end date or specific year range
- **When to omit**: When user wants data up to the present or doesn't specify end time
- **Examples**:
  - "Prices through 2023" → `max_year=2023`
  - "2020 to 2022" → `max_year=2022`
  - "Current prices" → omit

**Time period helpers**:
- "Q1 2024" → `min_year=2024, max_year=2024` (the tool aggregates weekly data)
- "2024" → `min_year=2024, max_year=2024`
- "Last 2 years" → `min_year=2023` (assuming current year is 2025)
- "Recent" or "latest" → omit both or use recent year range

### plot_type (string, optional, default="line")
- **What it is**: Type of visualization to generate
- **Valid values**: "line", "bar", "box"
- **When to use each**:
  - **"line"**: Time series, trends, price evolution over time
    - Keywords: "trend", "over time", "evolution", "history", "show prices"
  - **"bar"**: Average price comparisons across categories
    - Keywords: "compare", "average", "comparison", "vs", "versus"
  - **"box"**: Price distributions, ranges, volatility, quartiles
    - Keywords: "distribution", "range", "volatility", "spread", "variance"
- **Default behavior**: If user just says "show prices" without specifying visualization type, use "line"
- **Examples**:
  - "Show module price trends" → `plot_type="line"`
  - "Compare average prices" → `plot_type="bar"`
  - "Price distribution across regions" → `plot_type="box"`

### x_axis (string, optional, default="description")
- **What it is**: For bar/box charts, what to group by on the x-axis
- **Valid values**: "description", "region", "item"
- **Only relevant for**: bar and box charts (ignored for line charts)
- **When to specify**:
  - "description": Group by technology type (HJT vs PERC vs TOPCon)
  - "region": Group by geographic area (China vs US vs EU)
  - "item": Group by component type (Module vs Wafer vs Cell)
- **Examples**:
  - "Compare prices by technology" → `x_axis="description"`
  - "Average prices by region" → `x_axis="region"`
  - "Compare different components" → `x_axis="item"`

# Decision-Making Guidelines

## 1. Parse User Intent Carefully

Extract these elements from the user's query:
- **What component?** → `item`
- **What technology/subtype?** → `descriptions_csv`
- **What region?** → `region`
- **What time period?** → `min_year`, `max_year`
- **What visualization?** → `plot_type`, `x_axis`

## 2. Handle Implicit Information

**Technology implies component**:
- "TOPCon prices" → `item="Module"` + `descriptions_csv="TOPCon"`
- "PERC trends" → `item="Module"` + `descriptions_csv="PERC"`
- "Polysilicon purity trends" → `item="Polysilicon"`

**Comparison implies bar chart**:
- "Compare X and Y" → `plot_type="bar"`
- "X vs Y prices" → `plot_type="bar"`
- "Average prices of X, Y, Z" → `plot_type="bar"`

**Trends/evolution implies line chart**:
- "How have prices changed?" → `plot_type="line"`
- "Price trends" → `plot_type="line"`
- "Evolution of prices" → `plot_type="line"`

## 3. Default to Inclusive Filtering

**Key principle**: Only specify filters when the user is explicit or when clearly implied. When in doubt, omit the parameter to include all data.

- User doesn't mention region → omit `region` (includes all regions)
- User says "all module types" → omit `descriptions_csv`
- User doesn't mention years → omit both year parameters
- User asks for "prices" without specifics → minimal filtering

## 4. Use Partial Matching Strategically

For technology families, use the base term:
- "Show PERC prices" → `descriptions_csv="PERC"` (matches all PERC variants)
- "HJT modules" → `descriptions_csv="HJT"` (matches all HJT variants)

For specific variants, use full description:
- "PERC C only" → `descriptions_csv="p-type mono-Si PERC C"`

## 5. Handle Ambiguous Requests

If the user's request could mean multiple things:
- Make a reasonable interpretation based on context
- Call the tool with your best interpretation
- Explain your choice in your response

Don't ask for clarification unless the request is truly unclear.

# Response Guidelines

## After Calling the Tool

### If "plot generated successfully":
- Confirm what you've plotted
- Be specific about filters applied
- Keep it concise and natural

**Examples**:
- "I've generated a line chart showing TOPCon module price trends in China throughout 2024."
- "Here's a bar chart comparing the average prices of Aluminium and Copper across all regions."
- "I've created a box plot showing the price distribution for different PERC module variants in the EU market."

### If "plot generation failed":
- Acknowledge the issue
- Explain the most likely reason (no data for those filters, invalid combination)
- Suggest alternatives or ask for clarification

**Examples**:
- "I couldn't find data for 'XYZ Ultra' modules. The dataset includes technologies like TOPCon, PERC, HJT, and Al-BSF. Would you like to see prices for one of these instead?"
- "There's no data available for that specific region and year combination. Would you like to try a different time period or expand to more regions?"
- "That component type isn't in the dataset. Available components are: Module, Polysilicon, Wafer, Cell, PV Glass, Aluminium, Copper, EVA, and Silver."

## General Response Style

- **Be conversational and helpful**: You're assisting users in exploring data, not just executing commands
- **Be concise**: No need for lengthy explanations unless the user asks
- **Provide context**: Briefly explain what the visualization shows
- **Don't apologize excessively**: One acknowledgment of an issue is enough
- **Don't expose technical details**: Don't mention parameter names, tools, or internal processes unless relevant

# Important Reminders

- **Never generate JSON data structures yourself** - the tool does all data processing
- **Always call the tool** even if you're uncertain - it handles errors gracefully
- **Only specify parameters when explicitly stated or clearly implied** - default to inclusive
- **Use partial matching for technology families** - "PERC" is better than listing every variant
- **Infer component types from technologies** - "TOPCon" clearly refers to modules
- **Be helpful and conversational** - explain what you're showing, don't just confirm the action
- **Handle failures gracefully** - suggest alternatives when data isn't available
- **Don't overwhelm users with technical details** - keep responses natural and accessible

Your goal is to make data exploration easy and intuitive for users who may not know the exact technical terms or available options in the dataset.
"""

    def __init__(self, config: Optional[ComponentPricesConfig] = None):
        """Initialize the Component Prices Agent with multi-agent workflow"""
        self.config = config or ComponentPricesConfig()
        # Removed conversation_sessions dict - using stateless PostgreSQL sessions now

        # Initialize agents
        self._initialize_agents()

        logger.info("✅ Component Prices Agent initialized (Memory: Stateless PostgreSQL)")

    def _initialize_agents(self):
        """Initialize all agents in the workflow"""
        try:
            # Code interpreter for main data analysis agent (all 9 files)
            self.code_interpreter_main = CodeInterpreterTool(tool_config={
                "type": "code_interpreter",
                "container": {
                    "type": "auto",
                    "file_ids": self.config.file_ids
                }
            })

            # Code interpreter for plotting agent (single combined file)
            self.code_interpreter_plotting = CodeInterpreterTool(tool_config={
                "type": "code_interpreter",
                "container": {
                    "type": "auto",
                    "file_ids": [self.config.plotting_file_id]
                }
            })

            # 1. Classification Agent - Routes between data/plot/general intent
            self.classification_agent = Agent(
                name="Classification Agent",
                instructions="""You are a classification agent. Your job is to determine the user's intent based on their current query and conversation history.

Return EXACTLY one of these three values:
- "data" - if the user wants to analyze data, get insights, or ask questions about component prices
- "plot" - if the user wants to generate a chart, graph, or visualization
- "general" - if the user has general questions about what data is available, what components/regions exist, or how to use the system

IMPORTANT: Consider conversation context for follow-up queries:
- If the previous response was a plot and user says "now do it for China", classify as "plot"
- If the previous query was about plotting and user says "what about Modules?", classify as "plot"
- Look at the conversation history to understand what "it" or "that" refers to

Examples:
- "What are module prices in China?" -> "data"
- "Plot polysilicon prices over time" -> "plot"
- "What components do you have data for?" -> "general"
- "Show me a chart of copper prices" -> "plot"
- After a plot: "now do it for the EU" -> "plot"
- "What regions are available?" -> "general"
""",
                model="gpt-4.1-mini",
                output_type=ClassificationAgentSchema,
                model_settings=ModelSettings(
                    # Removed store=True - incompatible with SQLAlchemySession (no .id attribute)
                )
            )

            # 2. Info Agent - Handles general queries about available data
            self.info_agent = Agent(
                name="Info Agent",
                instructions="""You are an agent that handles general queries and provides information about the existing data.

**Dataset Description:**
You work with a structured CSV-based dataset called Component_Prices, containing historical price data for PV components. Each row represents a single price observation of a specific component, in a specific region, on a specific date.

**Items (Categories):**
Module, Polysilicon, Wafer, Cell, PV glass, Aluminium, Copper, EVA, Silver

**Descriptions by Item:**
- **Module**: CdTe; n-type HJT; n-type TOPCon; n-type mono-Si HJT; p-type mono-Si Al-BSF; p-type mono-Si PERC (various sizes: G1, G12, M10, M6, etc.); p-type multi-Si Al-BSF; p-type multi-Si PERC
- **Polysilicon**: Average purity 6N–8N; High purity 9N/9N+; Prime for mono-Si (China/Non-China); Prime for multi-Si
- **Wafer**: n-type HJT (G12, M6); n-type TOPCon (G12, M10); p-type mono-Si Al-BSF; p-type mono-Si PERC (various sizes); p-type multi-Si Al-BSF, PERC
- **Cell**: n-type HJT (G12, M6); n-type TOPCon (G12, M10); p-type mono-Si Al-BSF; p-type mono-Si PERC (G1, G12, M10, M6)
- **PV Glass**: Glass 2mm; Glass 3.2mm
- **Aluminium, Copper, EVA, Silver**: Single entry per item

**Units Used Per Item:**
- Module → US$/Wp
- Polysilicon → US$/kg
- Wafer → US$/pce
- Cell → US$/Wp
- PV glass → US$/m²
- Aluminium → US$/t
- Copper → US$/t
- EVA → US$/t
- Silver → US$/t and K US$/t

**Regions Available:**
China, EU, US, India, Australia, Overseas

**Frequency:** Weekly price data

**Your Role:**
- Answer questions about what data is available
- Explain the structure and content of the dataset
- Help users understand what they can query
- If asked for specific data analysis, suggest they rephrase as a data analysis query
- Never mention file names - always cite "Becquerel Institute Database"

**Response Formatting Guidelines:**
- **Start with a clear overview** using a ## header if the response warrants it
- **Use hierarchical headers** (## for main sections, ### for subsections) to organize information
- **Present lists of items in tables** when showing multiple categories or options
- **Use bullet points** for listing available components, regions, or capabilities
- **Bold important terms** like component names, regions, or data types
- **Add blank lines** between sections for readability
- **Keep paragraphs concise** (2-3 sentences maximum)
- **Use descriptive headers** that clarify what information is being presented
- **Format examples clearly** when showing how users can query the data
- **End with helpful suggestions** when appropriate

**Citation Guidelines:**
- ALWAYS cite as "Becquerel Institute Database"
- NEVER mention CSV files or filenames
- Use phrases like "According to the Becquerel Institute Database..." or "The database contains..."

**Important:**
- Be friendly and helpful
- Provide clear, well-structured information
- Guide users on how to ask better questions if needed
- Use conversation history to provide context-aware responses
""",
                model="gpt-4.1-mini",
                model_settings=ModelSettings(
                    temperature=1,
                    top_p=1,
                    max_tokens=2048
                    # Removed store=True - incompatible with SQLAlchemySession (no .id attribute)
                )
            )

            # 3. Data Analysis Agent - Analyzes component price data
            self.data_analysis_agent = Agent(
                name=self.config.agent_name,
                instructions=self.COMPONENT_PRICES_SCHEMA,
                model=self.config.model,
                tools=[self.code_interpreter_main],
                model_settings=ModelSettings(
                    # Removed store=True - incompatible with SQLAlchemySession (no .id attribute)
                    reasoning=Reasoning(
                        effort=self.config.reasoning_effort,
                        summary=self.config.reasoning_summary
                    )
                )
            )

            # 4. Plotting Agent - Extracts parameters and calls get_plot_data_output
            self.plotting_agent = Agent(
                name="Plotting Agent",
                instructions=self.PLOTTING_AGENT_INSTRUCTIONS,
                model=self.config.plotting_model,
                tools=[get_plot_data_output],  # Use function tool instead of Code Interpreter
                model_settings=ModelSettings(
                    parallel_tool_calls=True,
                    # Removed store=True - incompatible with SQLAlchemySession (no .id attribute)
                    reasoning=Reasoning(
                        effort=self.config.plotting_reasoning_effort,
                        summary=self.config.reasoning_summary
                    )
                )
            )

            logger.info("✅ All agents initialized successfully")

        except Exception as e:
            logger.error(f"❌ Error initializing agents: {e}")
            raise

    async def run_workflow_stream(self, user_query: str, conversation_id: str = None):
        """
        Run workflow with streaming response (for data analysis only, plots return complete)

        Args:
            user_query: User's natural language query
            conversation_id: Optional conversation ID for session management

        Yields:
            Text chunks as they are generated, or complete response for plots
        """
        with trace("Component Prices Workflow Stream"):
            try:
                # Create or get session from PostgreSQL
                agent_session = None
                if conversation_id:
                    agent_session = create_agent_session(conversation_id, agent_type="component_prices")
                    logger.info(f"📝 Using PostgreSQL session for conversation: {conversation_id}")
                else:
                    logger.info("📝 Running without session (stateless)")

                # Step 1: Classify intent (non-streaming)
                logger.info("🔍 Step 1: Classifying user intent...")
                classify_result = await Runner.run(
                    self.classification_agent,
                    input=user_query,
                    session=agent_session if conversation_id else None,
                    run_config=RunConfig(trace_metadata={"step": "classification"})
                )

                intent = classify_result.final_output.model_dump()["intent"]
                logger.info(f"✅ Intent classified as: {intent}")

                # Step 2: Route to appropriate agent based on intent
                if intent == "general":
                    logger.info("🔍 Step 2: Routing to Info Agent (streaming)...")
                    result = Runner.run_streamed(
                        self.info_agent,
                        user_query,
                        session=agent_session if conversation_id else None
                    )

                    # Stream text deltas as they arrive
                    async for event in result.stream_events():
                        if event.type == "raw_response_event":
                            from openai.types.responses import ResponseTextDeltaEvent
                            if isinstance(event.data, ResponseTextDeltaEvent):
                                cleaned_delta = clean_citation_markers(event.data.delta)
                                if cleaned_delta:
                                    yield cleaned_delta

                elif intent == "data":
                    logger.info("🔍 Step 2: Routing to Data Analysis Agent (streaming)...")
                    result = Runner.run_streamed(
                        self.data_analysis_agent,
                        user_query,
                        session=agent_session if conversation_id else None
                    )

                    # Stream text deltas as they arrive
                    async for event in result.stream_events():
                        if event.type == "raw_response_event":
                            from openai.types.responses import ResponseTextDeltaEvent
                            if isinstance(event.data, ResponseTextDeltaEvent):
                                cleaned_delta = clean_citation_markers(event.data.delta)
                                if cleaned_delta:
                                    yield cleaned_delta

                else:  # intent == "plot"
                    logger.info("🔍 Step 2: Routing to Plotting Agent (non-streaming for JSON)...")
                    # Plots need complete response for tool call extraction
                    agent_result = await Runner.run(
                        self.plotting_agent,
                        input=user_query,
                        session=agent_session if conversation_id else None,
                        run_config=RunConfig(trace_metadata={"step": "plotting"})
                    )

                    # Extract plot JSON from tool call results in new_items
                    plot_data = None
                    logger.info(f"🔍 Inspecting {len(agent_result.new_items)} new items from plotting agent")

                    # Log all items for debugging
                    for idx, item in enumerate(agent_result.new_items):
                        logger.info(f"📋 Item {idx}: type={type(item).__name__}")

                        # Try to extract function call parameters
                        if hasattr(item, 'function_call'):
                            logger.info(f"📞 Function call name: {item.function_call.name if hasattr(item.function_call, 'name') else 'unknown'}")
                            logger.info(f"📊 Function call arguments: {item.function_call.arguments if hasattr(item.function_call, 'arguments') else 'none'}")

                        # Check if this item is a function call result
                        if hasattr(item, 'function_call_output'):
                            # Function tool result contains the JSON dict returned by get_plot_data_output
                            try:
                                import json
                                plot_data = json.loads(item.function_call_output) if isinstance(item.function_call_output, str) else item.function_call_output
                                logger.info(f"✅ Extracted plot JSON from tool call: {plot_data.get('plot_type', 'unknown')} chart")
                                break
                            except Exception as e:
                                logger.error(f"❌ Failed to parse plot data from tool call: {e}")

                        # Alternative: check for output attribute
                        if hasattr(item, 'output'):
                            try:
                                import json
                                plot_data = json.loads(item.output) if isinstance(item.output, str) else item.output
                                logger.info(f"✅ Extracted plot JSON from item.output: {plot_data.get('plot_type', 'unknown')} chart")
                                break
                            except Exception as e:
                                logger.error(f"❌ Failed to parse plot data from item.output: {e}")

                    # Get agent's text response (confirmation message)
                    agent_text = agent_result.final_output_as(str)

                    # Yield plot JSON as SSE chunk
                    if plot_data and plot_data.get("success"):
                        # Send plot data as JSON chunk
                        import json
                        plot_chunk = json.dumps({"type": "plot", "content": plot_data})
                        yield plot_chunk
                        logger.info("✅ Yielded plot JSON chunk to frontend")
                    else:
                        logger.warning("⚠️ Plot generation failed or no plot data found")

                    # Yield agent's text response
                    yield agent_text

                logger.info("✅ Workflow streaming completed successfully")

            except Exception as e:
                logger.error(f"❌ Error in streaming workflow: {e}")
                import traceback
                logger.error(traceback.format_exc())
                yield f"\n\n**Error:** I encountered an error processing your request. Please try again or rephrase your question."

    async def run_workflow(self, workflow_input: WorkflowInput, conversation_id: str = None):
        """
        Run the multi-agent workflow for component price analysis

        Args:
            workflow_input: User input
            conversation_id: Optional conversation ID for session management

        Returns:
            Dict with response data
        """
        with trace("Component Prices Workflow"):
            try:
                # Create or get session from PostgreSQL
                agent_session = None
                if conversation_id:
                    agent_session = create_agent_session(conversation_id, agent_type="component_prices")
                    logger.info(f"📝 Using PostgreSQL session for conversation: {conversation_id}")
                else:
                    logger.info("📝 Running without session (stateless)")

                # Get user query as string (required when using session)
                user_query = workflow_input.input_as_text

                # Step 1: Classify intent
                logger.info("🔍 Step 1: Classifying user intent...")
                classify_result = await Runner.run(
                    self.classification_agent,
                    input=user_query,
                    session=agent_session if conversation_id else None,
                    run_config=RunConfig(
                        trace_metadata={"step": "classification"}
                    )
                )

                intent = classify_result.final_output.model_dump()["intent"]
                logger.info(f"✅ Intent classified as: {intent}")

                # Step 2: Route to appropriate agent based on intent
                if intent == "general":
                    logger.info("🔍 Step 2: Routing to Info Agent...")
                    agent_result = await Runner.run(
                        self.info_agent,
                        input=user_query,
                        session=agent_session if conversation_id else None,
                        run_config=RunConfig(
                            trace_metadata={"step": "info_query"}
                        )
                    )
                    raw_response = agent_result.final_output_as(str)
                    plot_data = None

                elif intent == "data":
                    logger.info("🔍 Step 2: Routing to Data Analysis Agent...")
                    agent_result = await Runner.run(
                        self.data_analysis_agent,
                        input=user_query,
                        session=agent_session if conversation_id else None,
                        run_config=RunConfig(
                            trace_metadata={"step": "data_analysis"}
                        )
                    )
                    raw_response = agent_result.final_output_as(str)
                    plot_data = None

                else:  # intent == "plot"
                    logger.info("🔍 Step 2: Routing to Plotting Agent...")
                    agent_result = await Runner.run(
                        self.plotting_agent,
                        input=user_query,
                        session=agent_session if conversation_id else None,
                        run_config=RunConfig(
                            trace_metadata={"step": "plotting"}
                        )
                    )

                    # Extract plot JSON from tool call results in new_items
                    plot_data = None
                    logger.info(f"🔍 Inspecting {len(agent_result.new_items)} new items from plotting agent")
                    for idx, item in enumerate(agent_result.new_items):
                        logger.info(f"🔍 Item {idx}: type={type(item).__name__}, attributes={dir(item)[:10]}")

                        # Check if this item is a function call result
                        if hasattr(item, 'function_call_output'):
                            # Function tool result contains the JSON dict returned by get_plot_data_output
                            try:
                                import json
                                plot_data = json.loads(item.function_call_output) if isinstance(item.function_call_output, str) else item.function_call_output
                                logger.info(f"✅ Extracted plot JSON from tool call: {plot_data.get('plot_type', 'unknown')} chart")
                                break
                            except Exception as e:
                                logger.error(f"❌ Failed to parse plot data from tool call: {e}")

                        # Alternative: check for output attribute
                        if hasattr(item, 'output'):
                            try:
                                import json
                                plot_data = json.loads(item.output) if isinstance(item.output, str) else item.output
                                logger.info(f"✅ Extracted plot JSON from item.output: {plot_data.get('plot_type', 'unknown')} chart")
                                break
                            except Exception as e:
                                logger.error(f"❌ Failed to parse plot data from item.output: {e}")

                    # Get agent's text response (confirmation message)
                    raw_response = agent_result.final_output_as(str)

                    if not plot_data or not plot_data.get("success"):
                        logger.warning("⚠️ Plot generation failed or no plot data found")
                        plot_data = None

                # Clean citation markers from raw response
                final_response = clean_citation_markers(raw_response)

                logger.info("✅ Workflow completed successfully")

                return {
                    "response": final_response,
                    "plot_data": plot_data,
                    "intent": intent,
                    "success": True
                }

            except Exception as e:
                logger.error(f"❌ Error in workflow: {e}")
                return {
                    "response": "I encountered an error processing your request. Please try again or rephrase your question.",
                    "plot_data": None,
                    "intent": None,
                    "quality": "bad_answer",
                    "success": False,
                    "error": str(e)
                }


# === Module-level function for external use ===
async def run_component_prices_workflow(workflow_input: WorkflowInput, conversation_id: str = None):
    """
    Convenience function to run the component prices workflow

    Args:
        workflow_input: User input
        conversation_id: Optional conversation ID

    Returns:
        Dict with response data
    """
    agent = ComponentPricesAgent()
    return await agent.run_workflow(workflow_input, conversation_id)
