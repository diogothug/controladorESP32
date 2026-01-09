import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { ProjectData } from '../shared/types';
const { v4: uuidv4 } = require('uuid');

export class ProjectManager {
    private projectsDir: string;

    constructor() {
        this.projectsDir = path.join(app.getPath('userData'), 'projects');
        this.ensureDir();
    }

    private ensureDir() {
        if (!fs.existsSync(this.projectsDir)) {
            fs.mkdirSync(this.projectsDir, { recursive: true });
        }
    }

    async saveProject(data: Partial<ProjectData>): Promise<ProjectData> {
        this.ensureDir();

        const project: ProjectData = {
            id: data.id || uuidv4(),
            name: data.name || 'Untitled Project',
            created: data.created || Date.now(),
            lastModified: Date.now(),
            boardConfig: data.boardConfig || { port: '', type: '' },
            firmwareConfig: data.firmwareConfig || { template: '', lastUploaded: 0 },
            modules: data.modules || []
        };

        const filePath = path.join(this.projectsDir, `${project.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(project, null, 2));

        return project;
    }

    async loadProject(id: string): Promise<ProjectData | null> {
        const filePath = path.join(this.projectsDir, `${id}.json`);
        if (!fs.existsSync(filePath)) return null;

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content) as ProjectData;
        } catch (e) {
            console.error(`Error loading project ${id}:`, e);
            return null;
        }
    }

    async listProjects(): Promise<ProjectData[]> {
        this.ensureDir();
        const files = fs.readdirSync(this.projectsDir).filter(f => f.endsWith('.json'));

        const projects: ProjectData[] = [];
        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(this.projectsDir, file), 'utf-8');
                projects.push(JSON.parse(content));
            } catch (e) {
                console.error(`Error reading project file ${file}:`, e);
            }
        }

        // Sort by last modified desc
        return projects.sort((a, b) => b.lastModified - a.lastModified);
    }

    async deleteProject(id: string): Promise<boolean> {
        const filePath = path.join(this.projectsDir, `${id}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    }
}

export const projectManager = new ProjectManager();
