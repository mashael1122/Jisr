def calculate_readiness(required_skills, user_skill_ids):
    total_weight = sum(skill["weight"] for skill in required_skills)

    if total_weight == 0:
        return 0

    matched_weight = sum(
        skill["weight"]
        for skill in required_skills
        if skill["skill_id"] in user_skill_ids
    )

    readiness = (matched_weight / total_weight) * 100

    return round(readiness, 1)