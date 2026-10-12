package com.example.board.repository;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.example.board.entity.User;

@SpringBootTest
@ActiveProfiles("test")
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void findAllTest() {

        List<User> users = userRepository.findAll();

        System.out.println("조회된 사용자 수: " + users.size());

        for (User user : users) {
            System.out.println(
                "id=" + user.getId()
                + ", username=" + user.getUsername()
                + ", nickname=" + user.getNickname()
            );
        }
    }
}