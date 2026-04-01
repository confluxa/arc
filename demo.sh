#!/bin/bash

export PS1="$ "

clear
echo "Resolving conflicting AI outputs"
sleep 1

echo ""
echo "→ Initializing workspace"
sleep 1
echo "$ arc init"
arc init
sleep 1.2

echo ""
echo "→ Asking first AI agent (GPT)"
echo "   Suggestion: Use JWT"
sleep 1
echo "$ arc publish --task auth --type proposal --content \"Use JWT\" --agent gpt"
arc publish --task auth --type proposal --content "Use JWT" --agent gpt
sleep 1.2

echo ""
echo "→ Asking second AI agent (Claude)"
echo "   Suggestion: Use OAuth"
sleep 1
echo "$ arc publish --task auth --type proposal --content \"Use OAuth\" --agent claude"
arc publish --task auth --type proposal --content "Use OAuth" --agent claude
sleep 1.2

echo ""
echo "→ Multiple AI agents disagree"
echo "→ Resolving conflict with ARC"
sleep 1.2

echo ""
echo "$ arc resolve auth"
arc resolve auth

# Force rendering buffer (VERY IMPORTANT)
echo ""
echo "----------------------------------------"
echo "ARC generated a unified approach"
echo "----------------------------------------"

# Keep terminal alive with visible frames
for i in 3 2 1; do
  echo "Ending demo in $i..."
  sleep 1
done