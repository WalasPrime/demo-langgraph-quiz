import { quizQuestionsSchema } from './quiz.schemas';
import { QuizAnswer, QuizQuestion } from './quiz.types';

export function validateQuizQuestions(questions: readonly QuizQuestion[]): void {
	quizQuestionsSchema.parse(questions);

	const questionIds = new Set<string>();

	for (const question of questions) {
		const optionIds = new Set(question.options.map((option) => option.id));

		if (questionIds.has(question.id) || optionIds.size !== question.options.length) {
			throw new Error('Generated quiz has duplicate question or option IDs');
		}

		questionIds.add(question.id);

		if (question.type === 'single-choice' && !optionIds.has(question.correctOptionId)) {
			throw new Error('Generated single-choice answer is invalid');
		}

		if (
			question.type === 'multi-choice' &&
			(!question.requiredOptionIds.length ||
				new Set(question.requiredOptionIds).size !== question.requiredOptionIds.length ||
				question.requiredOptionIds.some((id) => !optionIds.has(id)))
		) {
			throw new Error('Generated multi-choice answer is invalid');
		}
	}
}

export function validateAnswerOptions(question: QuizQuestion, answer: QuizAnswer): void {
	if (answer.selectedOptionIds.some((id) => !question.options.some((option) => option.id === id))) {
		throw new Error('Answer contains an unknown option');
	}
}

export function sameAnswerSelection(left: QuizAnswer, right: QuizAnswer): boolean {
	return JSON.stringify([...left.selectedOptionIds].sort()) === JSON.stringify([...right.selectedOptionIds].sort());
}
