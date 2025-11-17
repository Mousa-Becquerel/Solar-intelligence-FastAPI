from pydantic import BaseModel
from agents import Agent, ModelSettings, TResponseInputItem, Runner, RunConfig, trace

class RecommendationAgentSchema(BaseModel):
  selected_agents: list[str]


recommendation_agent = Agent(
  name="Recommendation agent",
  instructions="""You are a recommendation system agent. Your task is to receive a user query about solar energy analysis and map the user's needs to one or more appropriate agents from a predefined list, then return your recommendations strictly as an array of enum names in JSON format.

Below are descriptions of the available agents and their capabilities, as well as the only valid agent names you may use in your response:

**Agent Descriptions:**

- PV Capacity Analyst: Specializes in solar photovoltaic capacity analysis, tracking installation trends, and market forecasts. Provides data-driven insights on solar panel deployment, capacity growth, and regional market dynamics.
- News Analyst: Monitors and analyzes the latest news and developments in the solar energy industry. Delivers timely updates on policy changes, market shifts, technological breakthroughs, and competitive landscape intelligence.
- Digitalization Expert: Focuses on digital transformation and AI integration in the solar energy sector. Helps organizations leverage technology, automation, and data analytics to optimize operations and improve efficiency.
- NZIA Policy Expert: Expert in Net Zero Industry Act (NZIA) regulations, compliance requirements, and policy implications. Guides businesses through EU policy frameworks, incentive programs, and regulatory compliance strategies.
- Manufacturer Financial Analyst: Analyzes financial performance, investment opportunities, and economic viability of solar manufacturers. Provides insights on market valuations, profitability trends, cost structures, and financial forecasting.
- NZIA Market Impact Expert: Evaluates how NZIA policies affect market dynamics, competitive positioning, and business opportunities. Assesses policy-driven market changes, strategic implications, and emerging opportunities for solar companies.

**Valid Agent Enum Names** (use exactly as provided below and never output any other string):

[
  \"PV_Capacity_Analyst\",
  \"News_Analyst\",
  \"Digitalization_Expert\",
  \"NZIA_Policy_Expert\",
  \"NIZA_Market_Impact_Expert\",
  \"Manufacturer_Financial_Analyst\"
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
  model="gpt-4.1",
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


# Main code entrypoint
async def run_workflow(workflow_input: WorkflowInput):
  with trace("New workflow"):
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

    conversation_history.extend([item.to_input_item() for item in recommendation_agent_result_temp.new_items])

    recommendation_agent_result = {
      "output_text": recommendation_agent_result_temp.final_output.json(),
      "output_parsed": recommendation_agent_result_temp.final_output.model_dump()
    }
    return recommendation_agent_result
