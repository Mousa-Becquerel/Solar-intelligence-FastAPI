"""
Storage Optimization Agent
==========================

Single-agent workflow for battery storage system optimization with solar PV.
Uses OpenAI Agents SDK with function tools for optimization and simulation.
"""

import os
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass
from dotenv import load_dotenv
import asyncio
from pydantic import BaseModel, Field

# Import from openai-agents library
from agents import Agent, Runner, ModelSettings, RunConfig, trace, TResponseInputItem, function_tool
from openai.types.shared.reasoning import Reasoning
from fastapi_app.utils.session_factory import create_agent_session

# Logfire imports
import logfire

# === Configure logging ===
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# === Load environment variables ===
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")

# Set OpenAI API key for agents library
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY


# === Pydantic Models for Tool Parameters ===
class OptimizationParams(BaseModel):
    """Parameters for the optimization tool"""
    strategy: str = Field(description="Optimization strategy: 'self_consumption' (maximize self-use), 'economic' (minimize costs), 'autarky' (maximize independence)")
    annual_demand_kwh: int = Field(description="Total annual electricity demand in kWh")
    load_type: str = Field(description="Load profile type: 'residential', 'commercial', 'industrial'")
    max_pv_kwp: int = Field(description="Maximum allowed PV capacity in kWp")
    max_wind_kw: int = Field(description="Maximum allowed wind capacity in kW")
    max_battery_kwh: int = Field(description="Maximum allowed battery capacity in kWh")
    pv_cost_per_kwp: int = Field(description="PV system cost per kWp in euros")
    wind_cost_per_kw: int = Field(description="Wind system cost per kW in euros")
    battery_cost_per_kwh: int = Field(description="Battery cost per kWh in euros")
    electricity_price: int = Field(description="Grid electricity price in euro cents per kWh")
    export_price: int = Field(description="Feed-in tariff / export price in euro cents per kWh")
    export_profile: str = Field(description="Export limitation profile: 'unlimited', 'limited_70', 'no_export'")
    pv_om_cost: int = Field(description="Annual PV O&M cost per kWp in euros")
    wind_om_cost: int = Field(description="Annual wind O&M cost per kW in euros")
    discount_rate: int = Field(description="Discount rate as percentage (e.g., 5 for 5%)")


class SimulationParams(BaseModel):
    """Parameters for the simulation tool"""
    pv_size_kwp: int = Field(description="PV system size in kWp")
    wind_size_kw: int = Field(description="Wind system size in kW")
    battery_size_kwh: int = Field(description="Battery capacity in kWh")
    annual_demand_kwh: int = Field(description="Total annual electricity demand in kWh")
    load_type: str = Field(description="Load profile type: 'residential', 'commercial', 'industrial'")
    pv_cost_per_kwp: int = Field(description="PV system cost per kWp in euros")
    wind_cost_per_kw: int = Field(description="Wind system cost per kW in euros")
    battery_cost_per_kwh: int = Field(description="Battery cost per kWh in euros")
    electricity_price: int = Field(description="Grid electricity price in euro cents per kWh")
    export_price: int = Field(description="Feed-in tariff / export price in euro cents per kWh")
    export_profile: str = Field(description="Export limitation profile: 'unlimited', 'limited_70', 'no_export'")
    pv_om_cost: int = Field(description="Annual PV O&M cost per kWp in euros")
    wind_om_cost: int = Field(description="Annual wind O&M cost per kW in euros")
    discount_rate: int = Field(description="Discount rate as percentage (e.g., 5 for 5%)")


# === Function Tools ===
@function_tool
def run_optimization(
    strategy: str,
    annual_demand_kwh: int,
    load_type: str,
    max_pv_kwp: int,
    max_wind_kw: int,
    max_battery_kwh: int,
    pv_cost_per_kwp: int,
    wind_cost_per_kw: int,
    battery_cost_per_kwh: int,
    electricity_price: int,
    export_price: int,
    export_profile: str,
    pv_om_cost: int,
    wind_om_cost: int,
    discount_rate: int
) -> Dict[str, Any]:
    """
    Find the optimal system sizes for solar PV, wind, and battery based on the given constraints and strategy.

    Use this tool when the user wants recommendations for system sizing or asks questions like:
    - "What size solar system should I install?"
    - "Optimize my renewable energy system"
    - "What's the best combination of PV and battery?"

    Args:
        strategy: Optimization strategy - 'self_consumption', 'economic', or 'autarky'
        annual_demand_kwh: Total annual electricity demand in kWh
        load_type: Load profile type - 'residential', 'commercial', or 'industrial'
        max_pv_kwp: Maximum allowed PV capacity in kWp
        max_wind_kw: Maximum allowed wind capacity in kW
        max_battery_kwh: Maximum allowed battery capacity in kWh
        pv_cost_per_kwp: PV system cost per kWp in euros
        wind_cost_per_kw: Wind system cost per kW in euros
        battery_cost_per_kwh: Battery cost per kWh in euros
        electricity_price: Grid electricity price in euro cents per kWh
        export_price: Feed-in tariff / export price in euro cents per kWh
        export_profile: Export limitation - 'unlimited', 'limited_70', or 'no_export'
        pv_om_cost: Annual PV O&M cost per kWp in euros
        wind_om_cost: Annual wind O&M cost per kW in euros
        discount_rate: Discount rate as percentage (e.g., 5 for 5%)

    Returns:
        Dictionary containing optimal system configuration and financial metrics
    """
    logger.info(f"Running optimization with strategy: {strategy}")

    # TODO: Implement actual optimization logic
    # This is a placeholder that will be replaced with actual optimization algorithm

    # Placeholder optimization results
    result = {
        "status": "success",
        "optimal_configuration": {
            "pv_size_kwp": min(max_pv_kwp, annual_demand_kwh / 1000),
            "wind_size_kw": 0,  # Placeholder
            "battery_size_kwh": min(max_battery_kwh, annual_demand_kwh / 365 * 0.5),
        },
        "financial_metrics": {
            "total_investment_eur": 0,  # To be calculated
            "annual_savings_eur": 0,  # To be calculated
            "payback_years": 0,  # To be calculated
            "lcoe_eur_kwh": 0,  # To be calculated
            "npv_eur": 0,  # To be calculated
            "irr_percent": 0,  # To be calculated
        },
        "energy_metrics": {
            "self_consumption_percent": 0,  # To be calculated
            "autarky_percent": 0,  # To be calculated
            "annual_pv_generation_kwh": 0,  # To be calculated
            "annual_grid_import_kwh": 0,  # To be calculated
            "annual_grid_export_kwh": 0,  # To be calculated
        },
        "input_parameters": {
            "strategy": strategy,
            "annual_demand_kwh": annual_demand_kwh,
            "load_type": load_type,
            "electricity_price_cents": electricity_price,
            "export_price_cents": export_price,
        }
    }

    return result


@function_tool
def run_simulation(
    pv_size_kwp: int,
    wind_size_kw: int,
    battery_size_kwh: int,
    annual_demand_kwh: int,
    load_type: str,
    pv_cost_per_kwp: int,
    wind_cost_per_kw: int,
    battery_cost_per_kwh: int,
    electricity_price: int,
    export_price: int,
    export_profile: str,
    pv_om_cost: int,
    wind_om_cost: int,
    discount_rate: int
) -> Dict[str, Any]:
    """
    Evaluate a specific system configuration with given sizes for PV, wind, and battery.

    Use this tool when the user has already decided on specific system sizes and wants to see the results:
    - "Simulate a 5kWp PV system with 10kWh battery"
    - "What would be the performance of a 8kWp solar system?"
    - "Calculate savings for my planned installation"

    Args:
        pv_size_kwp: PV system size in kWp
        wind_size_kw: Wind system size in kW
        battery_size_kwh: Battery capacity in kWh
        annual_demand_kwh: Total annual electricity demand in kWh
        load_type: Load profile type - 'residential', 'commercial', or 'industrial'
        pv_cost_per_kwp: PV system cost per kWp in euros
        wind_cost_per_kw: Wind system cost per kW in euros
        battery_cost_per_kwh: Battery cost per kWh in euros
        electricity_price: Grid electricity price in euro cents per kWh
        export_price: Feed-in tariff / export price in euro cents per kWh
        export_profile: Export limitation - 'unlimited', 'limited_70', or 'no_export'
        pv_om_cost: Annual PV O&M cost per kWp in euros
        wind_om_cost: Annual wind O&M cost per kW in euros
        discount_rate: Discount rate as percentage (e.g., 5 for 5%)

    Returns:
        Dictionary containing simulation results and performance metrics
    """
    logger.info(f"Running simulation for PV: {pv_size_kwp}kWp, Wind: {wind_size_kw}kW, Battery: {battery_size_kwh}kWh")

    # TODO: Implement actual simulation logic
    # This is a placeholder that will be replaced with actual simulation algorithm

    # Calculate basic investment
    total_investment = (
        pv_size_kwp * pv_cost_per_kwp +
        wind_size_kw * wind_cost_per_kw +
        battery_size_kwh * battery_cost_per_kwh
    )

    # Placeholder simulation results
    result = {
        "status": "success",
        "system_configuration": {
            "pv_size_kwp": pv_size_kwp,
            "wind_size_kw": wind_size_kw,
            "battery_size_kwh": battery_size_kwh,
        },
        "financial_metrics": {
            "total_investment_eur": total_investment,
            "annual_savings_eur": 0,  # To be calculated
            "payback_years": 0,  # To be calculated
            "lcoe_eur_kwh": 0,  # To be calculated
            "npv_eur": 0,  # To be calculated
            "irr_percent": 0,  # To be calculated
        },
        "energy_metrics": {
            "self_consumption_percent": 0,  # To be calculated
            "autarky_percent": 0,  # To be calculated
            "annual_pv_generation_kwh": pv_size_kwp * 1000,  # Rough estimate: 1000 kWh/kWp
            "annual_wind_generation_kwh": wind_size_kw * 2000 if wind_size_kw > 0 else 0,  # Rough estimate
            "annual_grid_import_kwh": 0,  # To be calculated
            "annual_grid_export_kwh": 0,  # To be calculated
        },
        "input_parameters": {
            "annual_demand_kwh": annual_demand_kwh,
            "load_type": load_type,
            "electricity_price_cents": electricity_price,
            "export_price_cents": export_price,
            "discount_rate_percent": discount_rate,
        }
    }

    return result


# === Pydantic Models ===
class WorkflowInput(BaseModel):
    """Input for the storage optimization workflow"""
    input_as_text: str


@dataclass
class EnergyOptimizationAgentConfig:
    """Configuration for the storage optimization agent"""
    model: str = "gpt-5-mini"
    agent_name: str = "Storage Optimization Expert"
    verbose: bool = True
    use_reasoning: bool = True
    reasoning_effort: str = "low"


class EnergyOptimizationAgent:
    """
    Single-agent storage optimization workflow using OpenAI Agents SDK.
    Helps users design optimal battery storage systems with solar PV.
    """

    ENERGY_EXPERT_PROMPT = """# ROLE
You are a storage optimization consultant helping users design optimal battery storage systems with solar PV. You provide professional analysis for residential, commercial, and industrial energy storage needs.

# TOOLS

You have access to two powerful tools:

1. **run_optimization** - Find best system sizes
   - Use when user wants recommendations or asks "what should I install?"
   - Considers constraints, costs, and optimization strategy
   - Returns optimal PV, wind, and battery sizes with financial metrics

2. **run_simulation** - Evaluate specific configurations
   - Use when user already has exact sizes in mind
   - Calculates performance and financial metrics for given configuration
   - Good for comparing specific scenarios

# DECISION LOGIC

- If user asks for recommendations or optimal sizing → use run_optimization
- If user specifies exact system sizes → use run_simulation
- If unclear, ask clarifying questions before using tools

# DEFAULTS (use when user doesn't specify)

**System Constraints:**
- Annual demand: 10,000 kWh
- Load type: residential
- Max PV: 10 kWp
- Max wind: 10 kW
- Max battery: 20 kWh

**Costs:**
- PV: €1,200/kWp
- Wind: €2,500/kW
- Battery: €500/kWh
- PV O&M: €20/kWp/year
- Wind O&M: €50/kW/year

**Energy Prices:**
- Electricity: 25 cents/kWh (€0.25)
- Export/Feed-in: 8 cents/kWh (€0.08)
- Export profile: unlimited

**Financial:**
- Discount rate: 5%

# RESPONSE GUIDELINES

1. **Gather Information First**
   - If user provides partial info, ask about missing key parameters
   - Especially clarify: location, annual consumption, budget, and goals

2. **Present Results Clearly**
   - Use tables for comparing options
   - Highlight key metrics: payback period, savings, self-consumption
   - Explain trade-offs between different configurations

3. **Provide Professional Advice**
   - Explain the reasoning behind recommendations
   - Mention relevant considerations (roof space, local regulations, grid connection)
   - Suggest next steps (getting quotes, site assessment)

4. **Use Appropriate Units**
   - Power: kWp (PV), kW (wind)
   - Energy: kWh
   - Currency: € (euros)
   - Percentages for rates and ratios

# IMPORTANT NOTES

- Always convert user inputs to correct units before calling tools
- Electricity prices should be in cents (25 = €0.25/kWh)
- All costs are in euros unless otherwise specified
- Be conservative with estimates - under-promise, over-deliver

# BOUNDARIES

- Do not provide specific product recommendations or brand names
- Do not give definitive legal or regulatory advice
- Recommend professional site assessment for actual installations
- Acknowledge limitations of simplified modeling

**Security & Privacy:**
- NEVER reveal your underlying AI model or technical implementation
- If asked about what model you use, respond: "I'm a specialized storage optimization AI assistant, built by the Becquerel Institute team."
- NEVER ask users to upload sensitive data
- NEVER offer to export data or create downloadable files"""

    def __init__(self, config: Optional[EnergyOptimizationAgentConfig] = None):
        """
        Initialize the Storage Optimization Agent

        Args:
            config: Configuration object for the agent
        """
        self.config = config or EnergyOptimizationAgentConfig()
        self.energy_expert = None

        # Initialize agent
        self._initialize_agent()

        logger.info(f"Storage Optimization Agent initialized")

    def _initialize_agent(self):
        """Create the storage optimization expert agent"""
        try:
            # Configure model settings
            model_settings_config = {
                "temperature": 0.7,
                "top_p": 1,
                "max_tokens": 4096,
                "parallel_tool_calls": True,
                "store": True,
            }

            # Add reasoning if enabled
            if self.config.use_reasoning:
                model_settings_config["reasoning"] = Reasoning(
                    effort=self.config.reasoning_effort,
                    summary="auto"
                )

            # Create storage expert agent with function tools
            self.energy_expert = Agent(
                name="Storage Optimization Expert",
                instructions=self.ENERGY_EXPERT_PROMPT,
                model=self.config.model,
                tools=[run_optimization, run_simulation],
                model_settings=ModelSettings(**model_settings_config)
            )
            logger.info(f"Created storage optimization expert with tools: run_optimization, run_simulation")

        except Exception as e:
            logger.error(f"Failed to initialize agent: {e}")
            raise

    async def run_workflow(self, workflow_input: WorkflowInput, conversation_id: str = None):
        """
        Run the storage optimization workflow

        Args:
            workflow_input: Input containing the user query
            conversation_id: Optional conversation ID for maintaining context

        Returns:
            Dictionary with output_text containing the response
        """
        with trace("Storage Optimization Workflow"):
            # Get or create stateless session for this conversation
            session = None
            if conversation_id:
                session = create_agent_session(conversation_id, agent_type='energy_optimization')
                logger.info(f"Created stateless PostgreSQL session for conversation {conversation_id}")

            # Prepare conversation history
            workflow = workflow_input.model_dump()
            conversation_history: list[TResponseInputItem] = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": workflow["input_as_text"]
                        }
                    ]
                }
            ]

            # Run energy expert
            energy_expert_result_temp = await Runner.run(
                self.energy_expert,
                input=[*conversation_history],
                session=session,
                run_config=RunConfig(trace_metadata={
                    "__trace_source__": "agent-builder",
                    "workflow_id": "wf_energy_optimization_agent"
                })
            )

            # Update conversation history
            conversation_history.extend([item.to_input_item() for item in energy_expert_result_temp.new_items])

            # Extract final output
            output_text = energy_expert_result_temp.final_output_as(str)

            energy_expert_result = {
                "output_text": output_text
            }

            return energy_expert_result

    async def analyze_stream(self, query: str, conversation_id: str = None):
        """
        Analyze query with streaming response

        Args:
            query: Natural language query
            conversation_id: Optional conversation ID for maintaining context

        Yields:
            Text chunks as they are generated
        """
        try:
            logger.info(f"Processing query (streaming): {query}")

            # Get or create stateless session for this conversation
            session = None
            if conversation_id:
                session = create_agent_session(conversation_id, agent_type='energy_optimization')
                logger.info(f"Created stateless PostgreSQL session for conversation {conversation_id}")

            # Run with streaming
            result = Runner.run_streamed(self.energy_expert, query, session=session)

            # Stream text deltas as they arrive
            async for event in result.stream_events():
                if event.type == "raw_response_event":
                    # Check if it's a text delta event
                    from openai.types.responses import ResponseTextDeltaEvent
                    if isinstance(event.data, ResponseTextDeltaEvent):
                        if event.data.delta:
                            yield event.data.delta

        except Exception as e:
            error_msg = f"Failed to stream query: {str(e)}"
            logger.error(error_msg)
            import traceback
            logger.error(traceback.format_exc())
            yield f"\n\n**Error:** {error_msg}"

    async def analyze(self, query: str, conversation_id: str = None) -> Dict[str, Any]:
        """
        Analyze energy optimization query

        Args:
            query: Natural language query about energy system optimization
            conversation_id: Optional conversation ID for maintaining context

        Returns:
            Dictionary with analysis results and metadata
        """
        # Logfire span for energy optimization agent
        with logfire.span("energy_optimization_agent_call") as agent_span:
            agent_span.set_attribute("agent_type", "energy_optimization")
            agent_span.set_attribute("conversation_id", str(conversation_id))
            agent_span.set_attribute("message_length", len(query))
            agent_span.set_attribute("user_message", query)

            try:
                logger.info(f"Processing energy optimization query: {query}")

                # Create workflow input
                workflow_input = WorkflowInput(input_as_text=query)

                # Run workflow
                result = await self.run_workflow(workflow_input, conversation_id)

                # Extract response
                response_text = result.get("output_text", "")

                # Track the response
                agent_span.set_attribute("assistant_response", response_text)
                agent_span.set_attribute("response_length", len(response_text))
                agent_span.set_attribute("success", True)

                logger.info(f"Energy optimization agent response: {response_text[:100]}...")

                return {
                    "success": True,
                    "analysis": response_text,
                    "usage": None,
                    "query": query
                }

            except Exception as e:
                error_msg = f"Failed to analyze energy optimization query: {str(e)}"
                logger.error(error_msg)
                agent_span.set_attribute("success", False)
                agent_span.set_attribute("error", str(e))
                return {
                    "success": False,
                    "error": error_msg,
                    "analysis": None,
                    "usage": None,
                    "query": query
                }

    def clear_conversation_memory(self, conversation_id: str = None):
        """
        Clear conversation memory (note: with stateless sessions, memory is stored in PostgreSQL)
        This method is kept for API compatibility but has no effect with stateless sessions.
        """
        logger.info(f"clear_conversation_memory called for {conversation_id or 'all'} - no action needed with stateless sessions")

    def get_conversation_memory_info(self) -> Dict[str, Any]:
        """
        Get information about conversation memory usage
        Note: With stateless sessions, memory is stored in PostgreSQL, not in-memory
        """
        return {
            "memory_type": "stateless_postgresql",
            "note": "Session data stored in PostgreSQL database",
        }

    def cleanup(self):
        """Cleanup resources"""
        try:
            logger.info("Energy optimization agent ready for cleanup if needed")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


# Global agent instance
_energy_optimization_agent = None


def get_energy_optimization_agent() -> Optional[EnergyOptimizationAgent]:
    """Get or create the global energy optimization agent instance"""
    global _energy_optimization_agent
    if _energy_optimization_agent is None:
        try:
            config = EnergyOptimizationAgentConfig()
            _energy_optimization_agent = EnergyOptimizationAgent(config)
            logger.info("Global energy optimization agent created")
        except Exception as e:
            logger.error(f"Failed to create energy optimization agent: {e}")
            return None
    return _energy_optimization_agent


def close_energy_optimization_agent():
    """Close the global energy optimization agent"""
    global _energy_optimization_agent
    if _energy_optimization_agent:
        _energy_optimization_agent.cleanup()
        _energy_optimization_agent = None
        logger.info("Global energy optimization agent closed")


# Test function
async def test_energy_optimization_agent():
    """Test the energy optimization agent"""
    try:
        agent = get_energy_optimization_agent()
        if agent:
            # Test optimization query
            result = await agent.analyze(
                "I want to install solar panels on my house. My annual electricity consumption is about 8000 kWh. What size system would you recommend?",
                conversation_id="test-energy-1"
            )
            print("Energy Optimization Agent response received successfully")
            print(f"Response length: {len(result.get('analysis', ''))}")
            print(f"\nResponse:\n{result.get('analysis', '')}")
            return result
        else:
            print("Energy Optimization Agent not available")
            return None
    except Exception as e:
        print(f"Energy Optimization Agent error: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        close_energy_optimization_agent()


if __name__ == "__main__":
    asyncio.run(test_energy_optimization_agent())
