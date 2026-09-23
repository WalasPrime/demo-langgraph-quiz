import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient } from 'mongodb';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { AppConfig } from '../config/configuration';

@Injectable()
export class QuizGraphCheckpointer implements OnModuleDestroy {
  private readonly client: MongoClient;
  private saverPromise?: Promise<MongoDBSaver>;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    this.client = new MongoClient(this.config.getOrThrow('MONGODB_URI'));
  }

  async get(): Promise<MongoDBSaver> {
    this.saverPromise ??= this.connect();
    return this.saverPromise;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  private async connect(): Promise<MongoDBSaver> {
    await this.client.connect();
    const saver = new MongoDBSaver({
      client: this.client,
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
