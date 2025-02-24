import request from 'supertest';
import express from 'express';
import exerciseRouter from '../routes/exercises';

const app = express();
app.use(express.json());
app.use(exerciseRouter);

describe('Exercise API Endpoints', () => {
  describe('POST /api/exercises/predict-description', () => {
    it('should return exercise description for valid input', async () => {
      const response = await request(app)
        .post('/api/exercises/predict-description')
        .send({ exerciseName: 'Barbell Squat' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('difficulty');
      expect(response.body).toHaveProperty('primaryMuscleGroupId');
      expect(response.body).toHaveProperty('secondaryMuscleGroupIds');
    });

    it('should handle invalid input', async () => {
      const response = await request(app)
        .post('/api/exercises/predict-description')
        .send({ exerciseName: '' })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle OpenAI API errors', async () => {
      // Mock OpenAI to throw an error
      jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.reject(new Error('OpenAI API Error'))
      );

      const response = await request(app)
        .post('/api/exercises/predict-description')
        .send({ exerciseName: 'Barbell Squat' })
        .expect(500);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/exercises/predict-instructions', () => {
    it('should return exercise instructions for valid input', async () => {
      const response = await request(app)
        .post('/api/exercises/predict-instructions')
        .send({ exerciseName: 'Barbell Squat' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('instructions');
      expect(Array.isArray(response.body.instructions)).toBe(true);
    });

    it('should validate instructions format', async () => {
      const response = await request(app)
        .post('/api/exercises/predict-instructions')
        .send({ exerciseName: 'Barbell Squat' });

      const instructions = response.body.instructions;
      expect(Array.isArray(instructions)).toBe(true);
      instructions.forEach((instruction: string) => {
        expect(typeof instruction).toBe('string');
        expect(instruction.length).toBeGreaterThan(0);
      });
    });

    it('should handle malformed JSON responses', async () => {
      // Mock OpenAI to return malformed JSON
      jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve('<!DOCTYPE html>')
        } as Response)
      );

      const response = await request(app)
        .post('/api/exercises/predict-instructions')
        .send({ exerciseName: 'Barbell Squat' })
        .expect(500);

      expect(response.body.message).toMatch(/Failed to predict/);
    });
  });
});
