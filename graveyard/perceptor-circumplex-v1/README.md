# Perceptor Circumplex v1 - Archived

**Date Archived**: December 1, 2025

## Why Archived

This implementation was overly complex for what was needed. It included:
- Manual acoustic feature extraction (RMS, ZCR, spectral centroid)
- Dual-stream pattern (audio + acoustic metadata as text)
- Complex visualizer with quadrant rendering
- Database prompt integration

## The Problem

We were doing **feature engineering for a model that doesn't need it**. Gemini Live is sophisticated enough to directly output valence/arousal from raw audio+video without manual acoustic analysis.

## Lesson Learned

**Simpler is better.** Just ask Gemini for the two numbers (valence, arousal) directly from multimodal input. No need to extract and send acoustic features as text.

## What's Kept

The core idea (Russell's Circumplex Model) is sound. The next version (v2) will be drastically simpler:
- Multimodal input (audio + video)
- Single prompt: "Give me valence and arousal"
- Direct JSON response
- Simple visualization

## Contents

- `perceptor-circumplex-plan.md` - Original v1.0 plan
- `perceptor-circumplex-v2-plan.md` - 12-state upgrade plan
- `perceptor-circumplex-implementation.md` - Implementation log
- `perceptor-circumplex/` - Full implementation (HTML, JS, CSS)

