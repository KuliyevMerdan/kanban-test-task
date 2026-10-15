import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTasks1792056596806 implements MigrationInterface {
    name = 'CreateTasks1792056596806'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."task_status" AS ENUM('NEW', 'IN_PROGRESS', 'DONE')`);
        await queryRunner.query(`CREATE TYPE "public"."task_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH')`);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "title" character varying(200) NOT NULL, "description" text, "status" "public"."task_status" NOT NULL DEFAULT 'NEW', "priority" "public"."task_priority" NOT NULL DEFAULT 'MEDIUM', "position" character varying COLLATE "C" NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_status_position" ON "tasks"  ("status", "position") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_status_position"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TYPE "public"."task_priority"`);
        await queryRunner.query(`DROP TYPE "public"."task_status"`);
    }

}
