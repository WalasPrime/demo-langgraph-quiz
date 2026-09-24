import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient } from 'mongodb';
import { AppConfig } from '../config/configuration';

@Injectable()
export class MongoClientProvider implements OnModuleDestroy {
	private readonly client: MongoClient;
	private connectionPromise?: Promise<MongoClient>;

	constructor(private readonly config: ConfigService<AppConfig, true>) {
		this.client = new MongoClient(this.config.getOrThrow('MONGODB_URI'));
	}

	async get(): Promise<MongoClient> {
		this.connectionPromise ??= this.connect();

		return this.connectionPromise;
	}

	async onModuleDestroy(): Promise<void> {
		await this.client.close();
	}

	private async connect(): Promise<MongoClient> {
		await this.client.connect();

		return this.client;
	}
}
