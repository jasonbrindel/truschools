// Central configuration for all poll questions and their answer options
// This is used by the admin page to show all possible answers, even those with 0 votes

export interface PollQuestion {
  questionId: string;
  pageSlug: string;
  question: string;
  answers: string[];
}

export const pollQuestions: PollQuestion[] = [
  {
    questionId: 'schools-important-factor',
    pageSlug: 'schools',
    question: "What's most important when choosing a school?",
    answers: ['Academic quality', 'Location', 'Class size', 'Extracurriculars']
  },
  {
    questionId: 'elementary-bullying-advice',
    pageSlug: 'elementary-schools',
    question: 'What do you tell your child about bullying?',
    answers: ['Tell a teacher', 'Stand up for yourself', 'Ignore them', 'Tell me about it']
  },
  {
    questionId: 'middle-school-concern',
    pageSlug: 'middle-schools',
    question: "What's your biggest concern about middle school?",
    answers: ['Academic pressure', 'Social challenges', 'Homework load', 'Peer pressure']
  },
  {
    questionId: 'high-school-important-factor',
    pageSlug: 'high-schools',
    question: "What's most important when choosing a high school?",
    answers: ['Academic programs', 'College prep', 'Sports programs', 'Location']
  },
  {
    questionId: 'preschool-important-factor',
    pageSlug: 'preschools',
    question: 'What do you look for when choosing a preschool for your child?',
    answers: ['Location', 'Curriculum', 'Cost', 'Teacher Quality']
  },
  {
    questionId: 'kindergarten-important-factor',
    pageSlug: 'kindergartens',
    question: "What's most important when choosing a kindergarten?",
    answers: ['Full-day program', 'Class size', 'Teacher experience', 'Curriculum']
  },
  {
    questionId: 'college-important-factor',
    pageSlug: 'colleges-universities',
    question: "What's most important when choosing a college?",
    answers: ['Academic reputation', 'Cost & financial aid', 'Location', 'Career outcomes']
  },
  {
    questionId: 'charter-school-reason',
    pageSlug: 'charter-schools',
    question: "What's your main reason for considering a charter school?",
    answers: ['Academic excellence', 'Specialized programs', 'Smaller class sizes', 'School choice']
  },
  {
    questionId: 'magnet-school-interest',
    pageSlug: 'magnet-schools',
    question: 'What type of magnet program interests you most?',
    answers: ['STEM/Science', 'Performing Arts', 'Language Immersion', 'IB/Gifted']
  },
  {
    questionId: 'private-school-reason',
    pageSlug: 'private-schools',
    question: "What's your main reason for considering a private school?",
    answers: ['Academic excellence', 'Religious education', 'Smaller class sizes', 'Specialized programs']
  },
  {
    questionId: 'vocational-why-choose',
    pageSlug: 'vocational-schools',
    question: "What's most important to you when choosing a vocational school?",
    answers: ['Program length', 'Cost/tuition', 'Job placement rate', 'Location']
  },
  {
    questionId: 'trade-career-interest',
    pageSlug: 'trade-schools',
    question: 'Which trade career interests you most?',
    answers: ['HVAC Technician', 'Electrician', 'Welder', 'Plumber']
  },
  {
    questionId: 'beauty-career-interest',
    pageSlug: 'beauty-schools',
    question: 'Which beauty career interests you most?',
    answers: ['Hair Stylist', 'Esthetician', 'Nail Technician', 'Makeup Artist']
  },
  {
    questionId: 'culinary-career-interest',
    pageSlug: 'culinary-schools',
    question: 'Which culinary career path interests you most?',
    answers: ['Chef', 'Pastry Chef', 'Restaurant Manager', 'Food Service']
  },
  {
    questionId: 'tech-career-interest',
    pageSlug: 'technology-schools',
    question: 'Which tech career interests you most?',
    answers: ['Software Developer', 'Cybersecurity', 'Network Admin', 'IT Support']
  },
  {
    questionId: 'healthcare-career-interest',
    pageSlug: 'healthcare-schools',
    question: 'Which healthcare career interests you most?',
    answers: ['Nursing', 'Medical Assistant', 'Dental Assistant', 'Pharmacy Tech']
  },
  {
    questionId: 'financial-aid-student-debt',
    pageSlug: 'financial-aid',
    question: 'Would you assume significant student debt for your dream school?',
    answers: ['Yes, it\'s worth it', 'Only for a top school', 'I\'d choose affordability', 'Depends on my major']
  }
];

// Helper to get all answers for a given question ID
export function getAnswersForQuestion(questionId: string): string[] {
  const poll = pollQuestions.find(p => p.questionId === questionId);
  return poll?.answers || [];
}

// Helper to get poll config by question ID
export function getPollConfig(questionId: string): PollQuestion | undefined {
  return pollQuestions.find(p => p.questionId === questionId);
}
