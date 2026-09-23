import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { AppConfig } from '../config/configuration';
import { MongoClientProvider } from './mongo-client';

@Injectable()
export class QuizGraphCheckpointer {
  private saverPromise?: Promise<MongoDBSaver>;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly mongo: MongoClientProvider,
  ) {}

  async get(): Promise<MongoDBSaver> {
    this.saverPromise ??= this.connect();
    return this.saverPromise;
  }

  private async connect(): Promise<MongoDBSaver> {
    const saver = new MongoDBSaver({
      client: await this.mongo.get(),
      dbName: this.config.getOrThrow('MONGODB_DB'),
      enableTimestamps: true,
    });
    const errors = await saver.setup();
    if (errors.length > 0)
      throw new Error(
        `LangGraph MongoDB checkpointer setup failed: ${errors.map((error) => error.message).join('; ')}`,
      );
    return saver;
  }
}
