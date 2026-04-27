/**
 * WelcomeStep — First step of onboarding wizard
 *
 * Introduces the app and gets users excited to start.
 */

import { ArrowRight, Sparkles, Zap } from 'lucide-react';

import { Button, Card, CardContent, Heading } from '@ui';

// ── Constants ───────────────────────────────────────────────

const FEATURES = [
  {
    icon: Zap,
    title: 'Autonomous Agents',
    description: 'Run Claude coding agents on your projects with full context awareness.',
  },
  {
    icon: Sparkles,
    title: 'Task Management',
    description: 'Create, track, and manage development tasks with AI assistance.',
  },
] as const;

// ── Types ───────────────────────────────────────────────────

interface WelcomeStepProps {
  onNext: () => void;
}

// ── Component ───────────────────────────────────────────────

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Logo / Header */}
      <div className="bg-primary/10 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
        <Sparkles className="text-primary h-10 w-10" />
      </div>

      <Heading as="h1" className="mb-3 text-3xl font-bold">Welcome to ADC</Heading>

      <p className="text-muted-foreground mb-8 max-w-md text-lg">
        Your desktop companion for managing Claude autonomous coding agents.
      </p>

      {/* Feature highlights */}
      <div className="mb-10 grid w-full max-w-lg gap-4">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <CardContent className="flex items-start gap-4 p-4 text-left">
              <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <feature.icon className="text-primary h-5 w-5" />
              </div>
              <div>
                <Heading as="h3" className="font-medium">{feature.title}</Heading>
                <p className="text-muted-foreground mt-1 text-sm">{feature.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <Button size="lg" onClick={onNext}>
        Get Started
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
