
import { useState } from 'react';
import type { Project } from '../../types/youtube-shorts-content-factory/types'; // Adjusted to import type
import { ShortStatus } from '../../types/youtube-shorts-content-factory/types'; // ShortStatus is an enum, so regular import

const initialProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Coca-Cola ZERO Trademark Dispute',
    description: 'A series of shorts explaining the legal battles and marketing genius behind Coca-Cola ZERO.',
    shorts: [
      {
        id: 'short-1-1',
        projectId: 'proj-1',
        title: 'The "ZERO" Problem',
        status: ShortStatus.REVISED,
        script: {
          idea: 'Explain the initial trademark issue with the word "ZERO".',
          draft: 'Coke wanted to trademark ZERO, but was it too generic? The courts had to decide if a common word could be owned. This was the central conflict.',
          final: 'Can you own the word ZERO? Coca-Cola tried, but the courts pushed back. Here\'s the story of how they fought to own a number and why it mattered for their biggest launch ever. #cokewars'
        },
        metadata: {
          tags: 'coke, trademark, law, marketing',
          cta: 'Subscribe for more brand breakdowns!',
          imageIdeas: 'Gavel hitting a block, cans of Coke Zero, old courtroom sketches.',
          audioNotes: 'Fast-paced, suspenseful background music. Clear, authoritative voiceover.'
        }
      },
      {
        id: 'short-1-2',
        projectId: 'proj-1',
        title: 'Pepsi\'s Counter-Attack',
        status: ShortStatus.DRAFT_GENERATED,
        script: {
          idea: 'How did Pepsi react to Coke Zero? They launched their own "zero" calorie drink.',
          draft: 'Pepsi saw Coke\'s move and launched Pepsi Max, also a zero-calorie drink. It created a direct competition, forcing both brands to innovate.',
          final: ''
        },
        metadata: {
          tags: 'pepsi, coke, competition, business',
          cta: 'Which one do you prefer? Comment below!',
          imageIdeas: 'Side-by-side shots of Coke Zero and Pepsi Max cans.',
          audioNotes: 'Upbeat, competitive music.'
        }
      },
      {
        id: 'short-1-3',
        projectId: 'proj-1',
        title: 'The Final Verdict',
        status: ShortStatus.IDEA,
        script: {
          idea: 'What was the final outcome of the trademark case and how it shaped the industry.',
          draft: '',
          final: ''
        },
        metadata: {
          tags: '',
          cta: '',
          imageIdeas: '',
          audioNotes: ''
        }
      }
    ]
  },
  {
    id: 'proj-2',
    name: 'The Science of Crispr',
    description: 'Explaining the groundbreaking gene-editing technology Crispr-Cas9 in 60-second shorts.',
    shorts: [
        {
        id: 'short-2-1',
        projectId: 'proj-2',
        title: 'What is Crispr?',
        status: ShortStatus.IDEA,
        script: {
          idea: 'A super simple explanation of what Crispr is, using an analogy like "molecular scissors".',
          draft: '',
          final: ''
        },
        metadata: {
          tags: 'science, crispr, genetics, biology',
          cta: 'Follow to learn how we can cure diseases!',
          imageIdeas: 'Animated DNA strands, scissors cutting paper.',
          audioNotes: 'Curious and wondrous music.'
        }
      }
    ]
  }
];

export const useMockData = () => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const updateProject = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const addProject = (newProject: Project) => {
    setProjects([newProject, ...projects]);
  };
  
  return { projects, updateProject, addProject };
};
