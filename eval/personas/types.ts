/**
 * Simulated Learner Persona Definitions
 */

export interface PersonaResponse {
  message: string;
  signals?: Record<string, any>;
}

export interface Persona {
  name: string;
  description: string;
  generatePreQuizAnswer(scenario: any): string;
  generatePostQuizAnswer(scenario: any): string;
  respond(history: Array<{ role: string; text: string }>, topic: string): PersonaResponse;
}
