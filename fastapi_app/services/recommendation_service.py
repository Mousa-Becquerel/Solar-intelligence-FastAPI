"""
Agent Recommendation Service

Uses OpenAI Agents SDK to recommend appropriate agents based on user queries.
"""

from pydantic import BaseModel
from agents import Agent, ModelSettings, TResponseInputItem, Runner, RunConfig, trace


class RecommendationAgentSchema(BaseModel):
    selected_agents: list[str]


# Agent name mapping: from recommendation output to frontend AgentType
AGENT_NAME_MAPPING = {
    "PV_Capacity_Analyst": "market",  # Alex
    "News_Analyst": "news",  # Emma
    "Digitalization_Expert": "digitalization",  # Nova
    "NZIA_Policy_Expert": "nzia_policy",  # Aniza
    "NIZA_Market_Impact_Expert": "nzia_market_impact",  # Nina
    "Manufacturer_Financial_Analyst": "manufacturer_financial",  # Finn
    "Component_Prices_Analyst": "component_prices",  # Priya
    "IPV_Expert": "seamless",  # Sam
}


recommendation_agent = Agent(
    name="Recommendation agent",
    instructions="""You are a recommendation system agent. Your task is to receive a user query about solar energy analysis and map the user's needs to one or more appropriate agents from a predefined list, then return your recommendations strictly as an array of enum names in JSON format.

Below are descriptions of the available agents and their capabilities, as well as the only valid agent names you may use in your response:

**Agent Descriptions:**

- PV Capacity Analyst (Alex): Specializes in solar photovoltaic capacity analysis, tracking installation trends, and market forecasts. Provides data-driven insights on solar panel deployment, capacity growth, and regional market dynamics.
- News Analyst (Emma): Monitors and analyzes the latest news and developments in the solar energy industry. Delivers timely updates on policy changes, market shifts, technological breakthroughs, and competitive landscape intelligence.
- Digitalization Expert (Nova): Focuses on digital transformation and AI integration in the solar energy sector. Helps organizations leverage technology, automation, and data analytics to optimize operations and improve efficiency.
- NZIA Policy Expert (Aniza): Expert in Net Zero Industry Act (NZIA) regulations, compliance requirements, and policy implications. Guides businesses through EU policy frameworks, incentive programs, and regulatory compliance strategies.
- NZIA Market Impact Expert (Nina): Evaluates how NZIA policies affect market dynamics, competitive positioning, and business opportunities. Assesses policy-driven market changes, strategic implications, and emerging opportunities for solar companies.
- Manufacturer Financial Analyst (Finn): Analyzes financial performance, investment opportunities, and economic viability of solar manufacturers. Provides insights on market valuations, profitability trends, cost structures, and financial forecasting.
- Component Prices Analyst (Priya): Tracks and analyzes photovoltaic component pricing across the full PV value chain including modules, polysilicon, wafers, cells, and raw materials. Provides multi-region price comparisons, technology-specific pricing trends (PERC, TOPCon, HJT), and weekly price data updates covering China, EU, US, India, and Australia markets.
- IPV Expert (Sam): Retrieval-bound expert with access to 6 comprehensive documents covering IPV market analysis, regulatory environment, manufacturing costs, and long-term deployment scenarios. Provides insights on all integrated photovoltaic segments: BIPV (building-integrated), IIPV (infrastructure-integrated), AgriPV (agriculture), and VIPV (vehicle-integrated). Covers market potential, cost-competitiveness, stakeholder needs, standards compliance, and SAM forecasts up to 2050.

**Valid Agent Enum Names** (use exactly as provided below and never output any other string):

[
  \"PV_Capacity_Analyst\",
  \"News_Analyst\",
  \"Digitalization_Expert\",
  \"NZIA_Policy_Expert\",
  \"NIZA_Market_Impact_Expert\",
  \"Manufacturer_Financial_Analyst\",
  \"Component_Prices_Analyst\",
  \"IPV_Expert\"
]

# Steps

1. Carefully analyze the user's query to identify which agent roles can best address the user's needs, based on the agent descriptions.
2. Map each relevant agent description to its corresponding enum name from the list above.
3. Output your answer as a JSON object with a single key \"selected_agents\" and its value as an array of one or more applicable agent enum names.
4. Before producing your final answer, always reason step-by-step about which agents fit the query and why, but only return the JSON object in your formal output.

# Output Format

Your final answer must be a single JSON object formatted as follows:
- Output ONLY a JSON object, with a \"selected_agents\" key.
- The value must be an array containing one or more agent names, chosen strictly from the given enum list.
- Do not add extra commentary, explanations, formatting, or fields outside the JSON.

Example (for a hypothetical user query about solar panel installation trends and manufacturer financials):

{
  \"selected_agents\": [
    \"PV_Capacity_Analyst\",
    \"Manufacturer_Financial_Analyst\"
  ]
}

# Notes

- Only use enum names from the allowed list. No other output is valid.
- When multiple agents may be suitable, include them all in the array.
- The reasoning steps before your JSON output are for your internal chain-of-thought only and should not be presented to the user.

Remember: Carefully read the user query, map to the correct agent enum names, and return only the JSON object, nothing else.""",
    model="gpt-4.1-mini",
    output_type=RecommendationAgentSchema,
    model_settings=ModelSettings(
        temperature=1,
        top_p=1,
        max_tokens=2048,
        store=True
    )
)


class WorkflowInput(BaseModel):
    input_as_text: str


async def get_agent_recommendations(user_query: str) -> list[str]:
    """
    Get agent recommendations based on user query.

    Args:
        user_query: The user's question/need description

    Returns:
        List of AgentType strings (frontend format) recommended for the query
    """
    with trace("Agent Recommendation Workflow"):
        workflow_input = WorkflowInput(input_as_text=user_query)
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

        # Run the recommendation agent
        recommendation_agent_result_temp = await Runner.run(
            recommendation_agent,
            input=[
                *conversation_history
            ],
            run_config=RunConfig(trace_metadata={
                "__trace_source__": "agent-builder",
                "workflow_id": "wf_691b306e09c88190ad17e3f921cd42390c8c7b4467613b96"
            })
        )

        # Extract the selected agents from the result
        selected_agents = recommendation_agent_result_temp.final_output.selected_agents

        # Map agent names to frontend AgentType format
        mapped_agents = []
        for agent_name in selected_agents:
            if agent_name in AGENT_NAME_MAPPING:
                mapped_agents.append(AGENT_NAME_MAPPING[agent_name])

        return mapped_agents
