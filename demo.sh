#!/bin/bash

export PS1="$ "

clear
echo "ARC decision engine — conflicting agents → one decision"
sleep 0.8

echo ""
echo "→ Initializing workspace"
sleep 0.6
echo "$ arc init"
arc init
sleep 0.9

echo ""
echo "→ Agent 1 (GPT, proposer): Use JWT"
sleep 0.5
echo "$ arc publish --task auth --type proposal --content \"Use JWT\" --agent gpt --role proposer"
arc publish --task auth --type proposal --content "Use JWT" --agent gpt --role proposer
sleep 0.9

echo ""
echo "→ Agent 2 (Claude, validator): Use OAuth"
sleep 0.5
echo "$ arc publish --task auth --type proposal --content \"Use OAuth\" --agent claude --role validator"
arc publish --task auth --type proposal --content "Use OAuth" --agent claude --role validator
sleep 0.9

echo ""
echo "→ Run decision engine (Decision, Confidence, Reasoning, Trade-offs)"
sleep 0.8

echo ""
echo "$ arc resolve auth"
arc resolve auth

# Force rendering buffer (VERY IMPORTANT)
echo ""
echo "----------------------------------------"
echo "Structured decision — not just a diff"
echo "----------------------------------------"

# Keep terminal alive with visible frames
for i in 3 2 1; do
  echo "Ending demo in $i..."
  sleep 1
done